import { baseProcedure } from '../init';
import { z } from 'zod';
import { tryCatchAsync } from '@/utils/utils';
import neynarClient from 'neynar';
import prisma from 'prisma/prisma';

const NEYNAR_BATCH_SIZE = 300;

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

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
}

export async function getUsersDataOrFetchItFromNeynar(addresses: string[]) {
  /*
   * Cache Neynar identity data for seven days.
   *
   * Neynar has its own timestamp so ENS / .gwei / .wei / other name
   * lookups cannot accidentally make Farcaster/X data look fresh.
   */
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const sevenDaysAgo = new Date(Date.now() - sevenDays);

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

  const existingAddresses = new Set(
    users.map((user) => user.address.toLowerCase())
  );

  /*
   * Refresh when:
   *
   * - this address has never been checked through Neynar
   * - its Neynar cache is older than seven days
   * - it contains the old temporary !123-style Farcaster username
   *
   * Do NOT use generic lastUpdated here. That timestamp is also touched by
   * unrelated human-readable-name lookups.
   */
  const usersToUpdate = users
    .filter(
      (user) =>
        user.neynarLastUpdated === null ||
        user.neynarLastUpdated < sevenDaysAgo ||
        (user.farcasterTag && /^!\d+$/.test(user.farcasterTag))
    )
    .map((user) => user.address.toLowerCase());

  const missingAddresses = normalizedAddresses.filter(
    (address) => !existingAddresses.has(address)
  );

  const addressesToFetch = [
    ...new Set([...usersToUpdate, ...missingAddresses]),
  ];

  if (addressesToFetch.length === 0) {
    return users;
  }

  /*
   * Neynar's bulk address lookup has a finite request size.
   *
   * Keep batches comfortably below the limit and process them sequentially
   * so a very large poidh profile doesn't produce one oversized request or
   * a burst of simultaneous requests.
   */
  const batches = chunkArray(addressesToFetch, NEYNAR_BATCH_SIZE);

  const refreshedUsers: (typeof users)[number][] = [];

  for (const [batchIndex, batch] of batches.entries()) {
    const [usersData, error] = await tryCatchAsync(
      async () =>
        await neynarClient.fetchBulkUsersByEthOrSolAddress({
          addresses: batch,
        })
    );

    if (error) {
      console.error(
        `Neynar lookup failed for batch ${batchIndex + 1}/${batches.length}:`,
        error.message
      );

      /*
       * Do not fail the entire identity lookup because one batch failed.
       * Existing cached rows will still be returned below.
       */
      continue;
    }

    /*
     * Neynar response keys are wallet addresses. Normalize them before
     * matching so checksum casing cannot cause a missed identity.
     */
    const usersDataByAddress = new Map(
      Object.entries(usersData).map(([address, data]) => [
        address.toLowerCase(),
        data,
      ])
    );

    const refreshedAt = new Date();

    /*
     * Update every address from a successful Neynar batch.
     *
     * Even if Neynar has no Farcaster identity for an address, record the
     * successful lookup time. Otherwise wallets with no Farcaster account
     * would be queried again on every request forever.
     */
    const updates = batch.map((address) => {
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

    try {
      const updatedBatch = await prisma.$transaction(updates);
      refreshedUsers.push(...updatedBatch);
    } catch (error) {
      console.error(
        `Failed to save Neynar batch ${batchIndex + 1}/${batches.length}:`,
        error
      );
    }
  }

  /*
   * Start with every row we originally got from the database, then replace
   * any of those rows with their freshly updated versions.
   *
   * This is important: a Neynar failure must never make already-cached
   * Farcaster/Twitter information disappear from the response.
   */
  const usersByAddress = new Map<string, (typeof users)[number]>();

  for (const user of users) {
    usersByAddress.set(user.address.toLowerCase(), user);
  }

  for (const user of refreshedUsers) {
    usersByAddress.set(user.address.toLowerCase(), user);
  }

  return Array.from(usersByAddress.values());
}
