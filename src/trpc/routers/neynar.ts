import { baseProcedure } from '../init';
import { z } from 'zod';
import { tryCatchAsync } from '@/utils/utils';
import neynarClient from 'neynar';
import prisma from 'prisma/prisma';

const NEYNAR_REFRESH_LIMIT = 100;

export const neynarRouter = {
  usersData: baseProcedure
    .input(z.object({ addresses: z.array(z.string()) }))
    .query(async ({ input }) => {
      if (input.addresses.length === 0) {
        return [];
      }

      return getUsersDataOrFetchItFromNeynar(input.addresses);
    }),
};

export async function getUsersDataOrFetchItFromNeynar(addresses: string[]) {
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const sevenDaysAgo = new Date(Date.now() - sevenDays);

  /*
   * Deduplicate while preserving caller order.
   *
   * This matters for large account pages because the profile owner is added
   * first and should therefore get refresh priority.
   */
  const normalizedAddresses = [
    ...new Set(addresses.map((address) => address.toLowerCase())),
  ];

  const users = await prisma.usersExtra.findMany({
    where: {
      address: {
        in: normalizedAddresses,
      },
    },
  });

  const usersByAddress = new Map(
    users.map((user) => [user.address.toLowerCase(), user])
  );

  /*
   * Work through addresses in the exact order supplied by the caller.
   *
   * A user needs Neynar enrichment when:
   * - there is no UsersExtra row yet
   * - Neynar has never checked the row
   * - Neynar data is older than seven days
   * - it contains an old temporary !123-style Farcaster username
   */
  const addressesNeedingRefresh = normalizedAddresses.filter((address) => {
    const user = usersByAddress.get(address);

    if (!user) {
      return true;
    }

    return (
      user.neynarLastUpdated === null ||
      user.neynarLastUpdated < sevenDaysAgo ||
      (user.farcasterTag !== null &&
        /^!\d+$/.test(user.farcasterTag))
    );
  });

  /*
   * Never let one request try to refresh an enormous social graph.
   *
   * Cached identities are returned immediately below. Large profiles will
   * gradually warm the remaining cache over subsequent requests.
   */
  const addressesToFetch = addressesNeedingRefresh.slice(
    0,
    NEYNAR_REFRESH_LIMIT
  );

  if (addressesToFetch.length === 0) {
    return users;
  }

  const [usersData, error] = await tryCatchAsync(
    async () =>
      await neynarClient.fetchBulkUsersByEthOrSolAddress({
        addresses: addressesToFetch,
      })
  );

  /*
   * Neynar is enrichment only.
   *
   * If Neynar fails, preserve and return everything already cached rather
   * than making social identity data disappear from the response.
   */
  if (error) {
    console.error('Neynar user lookup failed:', error.message);
    return users;
  }

  const usersDataByAddress = new Map(
    Object.entries(usersData).map(([address, data]) => [
      address.toLowerCase(),
      data,
    ])
  );

  const refreshedAt = new Date();

  /*
   * Record a successful Neynar lookup even when Neynar does not know the
   * address. This gives wallets without Farcaster accounts a negative cache
   * and prevents them from being queried on every request.
   */
  const updates = addressesToFetch.map((address) => {
    const extra = usersDataByAddress.get(address)?.[0];

    if (!extra) {
      return prisma.usersExtra.upsert({
        where: {
          address,
        },

        create: {
          address,
          neynarLastUpdated: refreshedAt,
        },

        update: {
          neynarLastUpdated: refreshedAt,
        },
      });
    }

    const twitterTag =
      extra.verified_accounts?.find(
        (account) => account.platform === 'x'
      )?.username ?? null;

    return prisma.usersExtra.upsert({
      where: {
        address,
      },

      create: {
        address,
        pfpUrl: extra.pfp_url,
        farcasterTag: extra.username,
        farcasterFid: extra.fid,
        twitterTag,
        neynarLastUpdated: refreshedAt,
      },

      update: {
        pfpUrl: extra.pfp_url,
        farcasterTag: extra.username,
        farcasterFid: extra.fid,
        twitterTag,
        neynarLastUpdated: refreshedAt,
      },
    });
  });

  let refreshedUsers: (typeof users)[number][] = [];

  try {
    refreshedUsers = await prisma.$transaction(updates);
  } catch (error) {
    console.error('Failed to save Neynar user data:', error);

    /*
     * The Neynar call succeeding but the cache write failing should still
     * not destroy previously cached identity data.
     */
    return users;
  }

  /*
   * Merge fresh rows into the original database result.
   */
  const resultByAddress = new Map<string, (typeof users)[number]>();

  for (const user of users) {
    resultByAddress.set(user.address.toLowerCase(), user);
  }

  for (const user of refreshedUsers) {
    resultByAddress.set(user.address.toLowerCase(), user);
  }

  return Array.from(resultByAddress.values());
}
