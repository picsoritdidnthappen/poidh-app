import prisma from 'prisma/prisma';
import { baseProcedure } from '../init';
import { z } from 'zod';

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
};
