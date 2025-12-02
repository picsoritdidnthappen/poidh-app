import { z } from 'zod';
import { baseProcedure } from '../init';
import prisma from 'prisma/prisma';

export const commentsRouter = {
  fetch: baseProcedure
    .input(
      z.object({
        bountyId: z.number(),
        chainId: z.union([
          z.literal(8453),
          z.literal(666666666),
          z.literal(42161),
        ]),
      })
    )
    .query(async ({ input }) => {
      const { chainId: chain_id, bountyId: bounty_id } = input;

      const comments = await prisma.comments.findMany({
        where: {
          AND: [{ bounty_id }, { chain_id }],
        },
        orderBy: {
          created_at: 'asc',
        },
      });

      return comments;
    }),
};
