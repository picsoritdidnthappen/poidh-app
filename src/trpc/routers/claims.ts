import { z } from 'zod';
import { baseProcedure } from '../init';
import prisma from 'prisma/prisma';

export const claimsRouter = {
  fetch: baseProcedure
    .input(z.object({ claimId: z.number(), chainId: z.number() }))
    .query(async ({ input }) => {
      const claim = await prisma.claims.findUniqueOrThrow({
        where: {
          id_chainId: {
            id: input.claimId,
            chainId: input.chainId,
          },
          ban: {
            none: {},
          },
        },
      });

      return claim;
    }),

  /*
   * Lightweight homepage query.
   *
   * Important:
   * - only asks for actual "claim created" transactions
   * - does NOT resolve IPFS/media metadata on the server
   * - does NOT scan/paginate through the general activity feed
   */
  fetchLatest: baseProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(30).default(15),
      })
    )
    .query(async ({ input }) => {
      const txs = await prisma.transactions.findMany({
        where: {
          action: 'claim created',
          claimId: {
            not: null,
          },
          bounty: {
            ban: {
              none: {},
            },
          },
          claim: {
            is: {
              ban: {
                none: {},
              },
            },
          },
        },
        select: {
          bountyId: true,
          chainId: true,
          claim: {
            select: {
              id: true,
              chainId: true,
              title: true,
              url: true,
              issuer: true,
            },
          },
          bounty: {
            select: {
              id: true,
              chainId: true,
              title: true,
            },
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
        take: input.limit,
      });

      return txs.flatMap((tx) => {
        if (!tx.claim) {
          return [];
        }

        return [
          {
            claim: tx.claim,
            bountyId: tx.bounty?.id ?? tx.bountyId,
            chainId: tx.bounty?.chainId ?? tx.chainId,
            bountyTitle: tx.bounty?.title ?? '',
          },
        ];
      });
    }),

  fetchRecentPayouts: baseProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(30).default(12),
      })
    )
    .query(async ({ input }) => {
      const txs = await prisma.transactions.findMany({
        where: {
          action: 'claim accepted',

          bounty: {
            inProgress: false,
            isCanceled: false,

            ban: {
              none: {},
            },

            claims: {
              some: {
                isAccepted: true,

                ban: {
                  none: {},
                },
              },
            },
          },
        },

        select: {
          bountyId: true,
          chainId: true,
          timestamp: true,

          bounty: {
            select: {
              id: true,
              chainId: true,
              title: true,
              amount: true,

              extra: {
                select: {
                  amountSort: true,
                },
              },

              claims: {
                where: {
                  isAccepted: true,

                  ban: {
                    none: {},
                  },
                },

                select: {
                  id: true,
                  chainId: true,
                  title: true,
                  url: true,
                  issuer: true,
                },

                take: 1,
              },
            },
          },
        },

        orderBy: {
          timestamp: 'desc',
        },

        take: input.limit,
      });

      return txs.flatMap((tx) => {
        const claim = tx.bounty.claims[0];

        if (!claim) {
          return [];
        }

        return [
          {
            claim,
            bountyId: tx.bounty.id,
            chainId: tx.bounty.chainId,
            bountyTitle: tx.bounty.title,
            amount: tx.bounty.amount,
            amountUsd: tx.bounty.extra.amountSort,
            timestamp: tx.timestamp.toString(),
          },
        ];
      });
    }),

  fetchBountyClaims: baseProcedure
    .input(
      z.object({
        bountyId: z.number(),
        chainId: z.number(),
        limit: z.number().min(1).max(100).default(10),
        cursor: z.number().nullish(),
      })
    )
    .query(async ({ input }) => {
      const items = await prisma.claims.findMany({
        where: {
          bountyId: input.bountyId,
          chainId: input.chainId,
          ban: {
            none: {},
          },
          ...(input.cursor
            ? {
                isAccepted: false,
                id: {
                  lt: input.cursor,
                },
              }
            : {}),
        },
        orderBy: [!input.cursor ? { isAccepted: 'desc' } : {}, { id: 'desc' }],
        take: input.limit,
      });

      let nextCursor: number | undefined = undefined;

      if (items.length === input.limit) {
        nextCursor = items[items.length - 1].id;
      }

      return {
        items,
        nextCursor,
      };
    }),

  fetchAcceptedClaimByBountyId: baseProcedure
    .input(z.object({ bountyId: z.number(), chainId: z.number() }))
    .query(async ({ input }) => {
      const claim = await prisma.claims.findFirst({
        where: {
          bountyId: input.bountyId,
          chainId: input.chainId,
          ban: {
            none: {},
          },
          isAccepted: true,
        },
      });

      return claim;
    }),

  fetchVotingClaimByBountyId: baseProcedure
    .input(z.object({ bountyId: z.number(), chainId: z.number() }))
    .query(async ({ input }) => {
      const vote = await prisma.votes.findFirst({
        select: {
          claimId: true,
        },
        where: {
          ...input,
          bounty: {
            isVoting: true,
          },
        },
        orderBy: {
          round: 'desc',
        },
        take: 1,
      });

      if (!vote) {
        return null;
      }

      const claim = await prisma.claims.findFirst({
        where: {
          id: vote.claimId,
          chainId: input.chainId,
          ban: {
            none: {},
          },
        },
      });

      return claim;
    }),

  isCreated: baseProcedure
    .input(z.object({ chainId: z.number(), id: z.number() }))
    .query(async ({ input }) => {
      return prisma.claims.findUnique({
        where: {
          id_chainId: {
            id: input.id,
            chainId: input.chainId,
          },
        },
      });
    }),

  isAccepted: baseProcedure
    .input(z.object({ chainId: z.number(), id: z.number() }))
    .query(async ({ input }) => {
      return prisma.claims.findUnique({
        where: {
          id_chainId: {
            id: input.id,
            chainId: input.chainId,
          },
          isAccepted: true,
        },
      });
    }),
};
