import { baseProcedure } from '../init';
import { z } from 'zod';
import { NeynarAPIClient, Configuration } from '@neynar/nodejs-sdk';
import serverEnv from '@/utils/serverEnv';

const config = new Configuration({
  apiKey: serverEnv.NEYNAR_API_KEY || '',
});

export const neynarRouter = {
  usersData: baseProcedure
    .input(z.object({ addresses: z.array(z.string()) }))
    .query(async ({ input }) => {
      if (input.addresses.length === 0) {
        return {};
      }

      try {
        const client = new NeynarAPIClient(config);
        const users = await client.fetchBulkUsersByEthOrSolAddress({
          addresses: input.addresses,
        });

        return users;
      } catch (error) {
        return {};
      }
    }),
};
