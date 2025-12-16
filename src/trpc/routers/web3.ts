import prisma from 'prisma/prisma';
import { baseProcedure } from '../init';
import { z } from 'zod';
import { mainnetPublicClient, degenPublicClient } from '@/utils/publicClients';
import { DEGENNAMERESABI } from '@/constant';

export const web3Router = {
  fetchPrice: baseProcedure
    .input(
      z.object({
        currency: z.enum(['eth', 'degen']),
      })
    )
    .query(async ({ input }) => {
      const rate = await prisma.price.findFirst({
        take: 1,
        orderBy: { id: 'desc' },
      });

      if (!rate) {
        const response = await fetch(
          `https://api.coinbase.com/v2/exchange-rates?currency=${input.currency}`
        );
        const body = await response.json();
        return Number(body.data.rates.USD);
      }

      return input.currency === 'degen'
        ? Number(rate.degen_usd)
        : Number(rate.eth_usd);
    }),

  fetchEnsOrDegenName: baseProcedure
    .input(
      z.object({
        address: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        const ensName = await mainnetPublicClient.getEnsName({
          address: input.address as `0x${string}`,
        });

        if (ensName) {
          return ensName;
        }
      } catch {}

      try {
        const degenName = await degenPublicClient.readContract({
          abi: DEGENNAMERESABI,
          address: '0x4087fb91A1fBdef05761C02714335D232a2Bf3a1',
          functionName: 'defaultNames',
          args: [input.address as `0x${string}`],
        });

        if (degenName) {
          return `${degenName}.degen`;
        }
      } catch {}

      return null;
    }),
};
