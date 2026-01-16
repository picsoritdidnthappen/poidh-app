import { baseProcedure } from '../init';
import { z } from 'zod';
import { tryCatchAsync } from '@/utils/utils';
import neynarClient from 'neynar';
import prisma from 'prisma/prisma';

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
  // It's better to cache user data so we don't call Neynar every time.
  // Seven days feels like a good interval since we don't need real-time updates -
  // users don't change their name/PFP very often, and this can save us money long-term
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const sevenDaysAgo = new Date(Date.now() - sevenDays);
  const normalizedAddresses = addresses.map((address) =>
    address.toLocaleLowerCase()
  );

  const users = await prisma.usersExtra.findMany({
    where: {
      address: {
        in: normalizedAddresses,
      },
    },
  });

  // Set isn't strictly necessary, but it's a small O(1) lookup optimization
  const existingAddresses = new Set(users.map((user) => user.address));

  const usersToUpdate = users
    .filter((user) => user.lastUpdated < sevenDaysAgo)
    .map((user) => user.address);

  const missingAddresses = normalizedAddresses.filter(
    (a) => !existingAddresses.has(a)
  );

  const fetchFromNeynar = [...new Set([...usersToUpdate, ...missingAddresses])];

  if (fetchFromNeynar.length === 0) {
    return users;
  }

  const [usersData, error] = await tryCatchAsync(
    async () =>
      await neynarClient.fetchBulkUsersByEthOrSolAddress({
        addresses: fetchFromNeynar,
      })
  );

  if (error) {
    console.error(error.message);
    return users;
  }

  const neynarUserData = fetchFromNeynar
    .map((address) => {
      const extra = usersData[address]?.[0];
      if (!extra) {
        return null;
      }

      return { address, extra };
    })
    .filter((data) => data !== null);

  if (neynarUserData.length === 0) {
    return users;
  }

  const updatedUsers = await prisma.$transaction(
    neynarUserData.map((data) =>
      prisma.usersExtra.upsert({
        where: {
          address: data.address,
        },
        create: {
          address: data.address,
          pfpUrl: data.extra.pfp_url,
          farcasterTag: data.extra.username,
          twitterTag: data.extra.verified_accounts.find(
            (account) => account.platform === 'x'
          )?.username,
        },
        update: {
          pfpUrl: data.extra.pfp_url,
          farcasterTag: data.extra.username,
          twitterTag: data.extra.verified_accounts.find(
            (account) => account.platform === 'x'
          )?.username,
          lastUpdated: new Date(),
        },
      })
    )
  );

  const usersByAddress = new Map<string, (typeof users)[number]>();

  for (const user of users) {
    usersByAddress.set(user.address, user);
  }

  for (const user of updatedUsers) {
    usersByAddress.set(user.address, user);
  }

  return Array.from(usersByAddress.values());
}
