import { z } from 'zod';
import { baseProcedure } from '../init';
import prisma from 'prisma/prisma';
import { addressSchema } from '../serverTypes';
import { checkIsIssuer } from './admin';

export const bountiesRouter = {
  fetch: baseProcedure
    .input(z.object({ id: z.number(), chainId: z.number() }))
    .query(async ({ input }) => {
      const bounty = await prisma.bounties.findUniqueOrThrow({
        where: {
          id_chainId: {
            ...input,
          },
        },
        include: {
          claims: {
            where: {
              ban: { none: {} },
            },
            select: { id: true },
            take: 1,
          },
          ban: { take: 1 },
          participations: {
            select: { userAddress: true },
            take: 2,
          },
          extra: true,
        },
      });

      const { claims, participations, ...bountyData } = bounty;

      return {
        ...bountyData,
        hasClaims: claims.length > 0,
        hasParticipants: participations.length > 1,
      };
    }),

  fetchTransactions: baseProcedure
    .input(
      z.object({
        bountyId: z.number(),
        chainId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return prisma.transactions.findMany({
        where: {
          bountyId: input.bountyId,
          chainId: input.chainId,
        },
        orderBy: { timestamp: 'desc' },
      });
    }),

  addToAlbum: baseProcedure
    .input(
      z.object({
        bountyId: z.number(),
        chainId: z.number(),
        album: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return prisma.bountiesExtra.upsert({
        where: {
          bountyId_chainId: {
            bountyId: input.bountyId,
            chainId: input.chainId,
          },
        },
        create: {
          ...input,
        },
        update: {
          album: input.album,
        },
      });
    }),

  fetchAll: baseProcedure
    .input(
      z.object({
        status: z.enum(['open', 'progress', 'past']),
        sortType: z.enum(['value', 'date']).default('date'),
        limit: z.number().min(1).max(100).default(10),
        cursor: z
          .object({
            createdAt: z.coerce.number(),
            amountSort: z.number(),
            ids: z.array(z.number()),
          })
          .nullish(),
      })
    )
    .query(async ({ input }) => {
      const sortByDate = input.sortType === 'date';
      const sortByValue = input.sortType === 'value';

      const items = await prisma.bounties.findMany({
        include: {
          claims: {
            take: 1,
            where: {
              ban: {
                none: {},
              },
            },
            orderBy: { isAccepted: 'desc' },
          },
          participations: {
            select: { userAddress: true },
            take: 2,
          },
        },

        where: {
          inProgress: true,
          isCanceled: false,
          ban: {
            none: {},
          },

          ...(input.status === 'open'
            ? {
                isVoting: false,
              }
            : input.status === 'progress'
            ? {
                isVoting: true,
              }
            : input.status === 'past'
            ? {
                inProgress: false,
              }
            : {}),

          ...(input.cursor
            ? sortByDate
              ? {
                  createdAt: { lt: input.cursor.createdAt },
                  id: { notIn: input.cursor.ids },
                }
              : { amountSort: { lt: input.cursor.amountSort } }
            : {}),
        },

        orderBy: sortByDate
          ? { createdAt: 'desc' }
          : sortByValue
          ? { amountSort: 'desc' }
          : {},

        distinct: 'id',
        take: input.limit,
      });

      let nextCursor:
        | {
            createdAt: number;
            amountSort: number;
            ids: number[];
          }
        | undefined = undefined;

      if (items.length === input.limit) {
        const last = items[items.length - 1];

        nextCursor = {
          createdAt: last.createdAt.toNumber(),
          amountSort: last.amountSort,
          ids: [...(input.cursor?.ids ?? []), ...items.map((item) => item.id)],
        };
      }

      return {
        items: items.map(({ claims, participations, ...bounty }) => ({
          ...bounty,
          hasClaims: claims.length > 0,
          createdAt: bounty.createdAt.toNumber(),
          hasParticipants: participations.length > 1,
        })),
        nextCursor,
      };
    }),

  fetchByAlbum: baseProcedure
    .input(
      z.object({
        album: z.string(),
        status: z.enum(['open', 'progress', 'past']),
        limit: z.number().min(1).max(100).default(15),
        cursor: z.number().nullish(),
      })
    )
    .query(async ({ input }) => {
      const items = await prisma.bounties.findMany({
        include: {
          claims: {
            take: 1,
            where: {
              ban: {
                none: {},
              },
            },
            orderBy: { isAccepted: 'desc' },
          },
          participations: {
            select: { userAddress: true },
            take: 2,
          },
        },

        where: {
          inProgress: true,
          isCanceled: false,
          extra: {
            album: { equals: input.album, mode: 'insensitive' },
          },
          ban: {
            none: {},
          },
          ...(input.cursor ? { createdAt: { lt: input.cursor } } : {}),

          ...(input.status === 'open'
            ? {
                isVoting: false,
              }
            : input.status === 'progress'
            ? {
                isVoting: true,
              }
            : input.status === 'past'
            ? {
                inProgress: false,
              }
            : {}),
        },

        distinct: 'id',
        orderBy: { createdAt: 'desc' },
        take: input.limit,
      });

      let nextCursor: number | undefined = undefined;
      if (items.length === input.limit) {
        nextCursor = items[items.length - 1].id;
      }

      return {
        items: items.map(({ claims, participations, ...bounty }) => ({
          ...bounty,
          hasClaims: claims.length > 0,
          createdAt: bounty.createdAt.toNumber(),
          hasParticipants: participations.length > 1,
        })),
        nextCursor,
      };
    }),

  participations: baseProcedure
    .input(z.object({ bountyId: z.number(), chainId: z.number() }))
    .query(async ({ input }) => {
      return prisma.participationsBounties.findMany({
        select: {
          amount: true,
          userAddress: true,
        },
        where: {
          ...input,
        },
      });
    }),

  claimsCount: baseProcedure
    .input(
      z.object({
        bountyId: z.number(),
        chainId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return await prisma.claims.count({
        where: {
          ...input,
          ban: {
            none: {},
          },
        },
      });
    }),

  fetchVoting: baseProcedure
    .input(z.object({ chainId: z.number(), bountyId: z.number() }))
    .query(async ({ input }) => {
      const voting = await prisma.votes.findFirst({
        where: {
          ...input,
        },
        orderBy: { round: 'desc' },
      });

      if (!voting) {
        return null;
      }

      return {
        ...voting,
        yes: voting.yes.toNumber(),
        no: voting.no.toNumber(),
      };
    }),

  isCreated: baseProcedure
    .input(z.object({ chainId: z.number(), id: z.number() }))
    .query(async ({ input }) => {
      return prisma.bounties.findFirst({
        where: {
          chainId: input.chainId,
          onChainId: input.id,
          inProgress: true,
        },
      });
    }),

  isCanceled: baseProcedure
    .input(z.object({ chainId: z.number(), id: z.number() }))
    .query(async ({ input }) => {
      return prisma.bounties.findUnique({
        where: {
          id_chainId: {
            ...input,
          },
          isCanceled: true,
        },
      });
    }),

  isJoined: baseProcedure
    .input(
      z.object({
        bountyId: z.number(),
        chainId: z.number(),
        participantAddress: addressSchema,
      })
    )
    .query(async ({ input }) => {
      return prisma.participationsBounties.findUnique({
        where: {
          userAddress_bountyId_chainId: {
            bountyId: input.bountyId,
            userAddress: input.participantAddress.toLowerCase(),
            chainId: input.chainId,
          },
        },
      });
    }),

  isWithdraw: baseProcedure
    .input(
      z.object({
        bountyId: z.number(),
        chainId: z.number(),
        participantAddress: addressSchema,
      })
    )
    .query(async ({ input }) => {
      return prisma.participationsBounties.findUnique({
        where: {
          userAddress_bountyId_chainId: {
            bountyId: input.bountyId,
            userAddress: input.participantAddress.toLowerCase(),
            chainId: input.chainId,
          },
        },
      });
    }),

  isIssuer: baseProcedure
    .input(
      z.object({
        chainId: z.number(),
        bountyId: z.number(),
        address: addressSchema.optional(),
      })
    )
    .query(async ({ input }) => {
      return checkIsIssuer({
        ...input,
      });
    }),

  fetchByKeyword: baseProcedure
    .input(
      z.object({
        keyword: z.string(),
        limit: z.number().min(1).max(100).default(15),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ input }) => {
      const q = input.keyword.trim();

      const items = await prisma.bounties.findMany({
        include: {
          claims: {
            take: 1,
            where: {
              ban: {
                none: {},
              },
            },
          },
          participations: {
            select: { userAddress: true },
            take: 2,
          },
        },

        where: {
          isCanceled: false,
          ban: { none: {} },
          ...(q === ''
            ? {
                inProgress: true,
                isVoting: false,
              }
            : {
                OR: [
                  { title: { contains: q, mode: 'insensitive' } },
                  { description: { contains: q, mode: 'insensitive' } },
                ],
              }),
          ...(input.cursor ? { createdAt: { lt: input.cursor } } : {}),
        },

        distinct: 'id',
        orderBy: { createdAt: 'desc' },
        take: input.limit,
      });

      let nextCursor: string | undefined = undefined;
      if (items.length === input.limit) {
        nextCursor = items[items.length - 1].createdAt.toString();
      }

      return {
        items: items.map(({ claims, participations, ...bounty }) => ({
          ...bounty,
          createdAt: bounty.createdAt.toNumber(),
          hasClaims: claims.length > 0,
          hasParticipants: participations.length > 1,
        })),
        nextCursor,
      };
    }),
};
