import { baseProcedure } from '../init';
import { z } from 'zod';
import { tryCatchAsync } from '@/utils/utils';
import neynarClient from 'neynar';

export const neynarRouter = {
  usersData: baseProcedure
    .input(z.object({ addresses: z.array(z.string()) }))
    .query(async ({ input }) => {
      if (input.addresses.length === 0) {
        return {};
      }

      const [users, error] = await tryCatchAsync(
        async () =>
          await neynarClient.fetchBulkUsersByEthOrSolAddress({
            addresses: input.addresses,
          })
      );

      if (error) {
        console.error(error.message);
        return {};
      }

      return users;
    }),
};
