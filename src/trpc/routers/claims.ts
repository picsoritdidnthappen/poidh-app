import { z } from 'zod';
import { baseProcedure } from '../init';
import prisma from 'prisma/prisma';

export const claimsRouter = {
  fetchRandomAccepted: baseProcedure
    .input(
      z.object({
        limit: z.number().min(0).default(24),
      })
    )
    .query(async ({ input }) => {
      return await prisma.$queryRaw`
        SELECT c.*,
          c.chain_id AS "chainId",
          c.is_accepted AS "accepted",
          c.bounty_id AS "bountyId",
          b.title AS "bountyTitle",
          b.amount AS "bountyAmount",
          b.is_multiplayer AS "isMultiplayer"
        FROM "Claims" c
        JOIN (
            SELECT id, chain_id, title, amount, is_multiplayer
            FROM "Bounties"
            WHERE in_progress IS FALSE
              AND is_canceled IS FALSE
        ) b ON c.bounty_id = b.id AND c.chain_id = b.chain_id
        WHERE c.is_accepted IS TRUE
        ORDER BY RANDOM()
        LIMIT ${input.limit};
      `;
    }),

  fetch: baseProcedure
    .input(z.object({ claimId: z.number(), chainId: z.number() }))
    .query(async ({ input }) => {
      return prisma.claims.findUniqueOrThrow({
        where: {
          id_chain_id: {
            id: input.claimId,
            chain_id: input.chainId,
          },
          ban: {
            none: {},
          },
        },
        select: {
          id: true,
          issuer: true,
          bounty_id: true,
          title: true,
          description: true,
          is_accepted: true,
          url: true,
        },
      });
    }),

  isCreated: baseProcedure
    .input(z.object({ chainId: z.number(), id: z.number() }))
    .query(async ({ input }) => {
      return prisma.claims.findUnique({
        where: {
          id_chain_id: {
            id: input.id,
            chain_id: input.chainId,
          },
        },
      });
    }),

  isAccepted: baseProcedure
    .input(z.object({ chainId: z.number(), id: z.number() }))
    .query(async ({ input }) => {
      return prisma.claims.findUnique({
        where: {
          id_chain_id: {
            id: input.id,
            chain_id: input.chainId,
          },
          is_accepted: true,
        },
      });
    }),
};
