import { z } from 'zod';
import { baseProcedure } from '../init';
import prisma from 'prisma/prisma';
import { addressSchema } from '../serverTypes';
import { checkIsIssuer } from './admin';
import { ChainId } from '@/utils/types';
import { Decimal } from '@prisma/client/runtime/library';

export const bountiesRouter = {
  fetch: baseProcedure
    .input(z.object({ id: z.number(), chainId: z.number() }))
    .query(async ({ input }) => {
      const bounty = await prisma.bounties.findUniqueOrThrow({
        where: {
          id_chain_id: {
            id: input.id,
            chain_id: input.chainId,
          },
        },
        include: {
          ban: true,
          claims: {
            take: 1,
          },
          participations: {
            select: {
              amount: true,
              user_address: true,
            },
          },
          transactions: {
            select: {
              tx: true,
              address: true,
              action: true,
              timestamp: true,
            },
            orderBy: {
              timestamp: 'desc',
            },
          },
        },
      });

      return {
        ...bounty,
        id: bounty.id.toString(),
        hasClaims: bounty.claims.length > 0,
        inProgress: bounty.in_progress,
        isMultiplayer: bounty.is_multiplayer,
        isBanned: bounty.ban.length > 0,
        isCanceled: bounty.is_canceled,
      };
    }),

  extra: baseProcedure
    .input(z.object({ bountyId: z.number(), chainId: z.number() }))
    .query(async ({ input }) => {
      const bountyExtra = await prisma.bountiesExtra.findUnique({
        where: {
          bounty_id_chain_id: {
            bounty_id: input.bountyId,
            chain_id: input.chainId,
          },
        },
      });

      return bountyExtra ?? null;
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
      const bountyExtra = await prisma.bountiesExtra.upsert({
        where: {
          bounty_id_chain_id: {
            bounty_id: input.bountyId,
            chain_id: input.chainId,
          },
        },
        create: {
          bounty_id: input.bountyId,
          chain_id: input.chainId,
          album: input.album,
        },
        update: {
          album: input.album,
        },
      });

      return bountyExtra;
    }),

  fetchAll: baseProcedure
    .input(
      z.object({
        status: z.enum(['open', 'progress', 'past']),
        limit: z.number().min(1).max(100).default(10),
        cursor: z
          .object({
            created_at: z.coerce.number(),
            amount_sort: z.number(),
            dates: z.array(z.number()),
          })
          .nullish(),
        sortType: z.enum(['value', 'date']).default('date'),
      })
    )
    .query(async ({ input }) => {
      const sortByDate = input.sortType === 'date';
      const sortByValue = input.sortType === 'value';
      const items = await prisma.bounties.findMany({
        where: {
          ban: {
            none: {},
          },
          is_canceled: false,
          ...(input.status === 'open'
            ? {
                in_progress: true,
                is_voting: false,
              }
            : {}),
          ...(input.status === 'progress'
            ? {
                in_progress: true,
                is_voting: true,
              }
            : {}),
          ...(input.status === 'past'
            ? {
                in_progress: false,
                is_canceled: false,
              }
            : {}),
          ...(input.cursor
            ? sortByDate
              ? { created_at: { lt: input.cursor.created_at } }
              : { amount_sort: { lte: input.cursor.amount_sort } }
            : {}),
          ...(input.cursor &&
            !sortByDate && { created_at: { notIn: input.cursor.dates } }),
        },
        include: {
          claims: {
            take: 1,
            where: {
              ban: {
                none: {},
              },
            },
            orderBy: { is_accepted: 'desc' },
          },
        },
        orderBy: sortByDate
          ? { created_at: 'desc' }
          : sortByValue
          ? { amount_sort: 'desc' }
          : {},
        take: input.limit,
      });

      let nextCursor:
        | {
            created_at: number;
            amount_sort: number;
            dates: number[];
          }
        | undefined = undefined;

      if (items.length === input.limit) {
        const last = items[items.length - 1];

        const toNum = (v: Decimal) =>
          typeof v === 'number'
            ? v
            : v && typeof v.toNumber === 'function'
            ? v.toNumber()
            : Number(v);

        nextCursor = {
          created_at: toNum(last.created_at),
          amount_sort: last.amount_sort,
          dates: [
            ...(input.cursor?.dates ?? []),
            ...items.map((item) => Number(item.created_at)),
          ],
        };
      }

      return {
        items,
        nextCursor,
      };
    }),

  fetchByAlbum: baseProcedure
    .input(
      z.object({
        album: z.string(),
        status: z.enum(['open', 'progress', 'past']),
      })
    )
    .query(async ({ input }) => {
      const extras = await prisma.bountiesExtra.findMany({
        where: { album: { equals: input.album, mode: 'insensitive' } },
        select: { bounty_id: true, chain_id: true },
      });

      if (extras.length === 0) {
        return [];
      }

      const orFilters = extras.map((e) => ({
        id: e.bounty_id,
        chain_id: e.chain_id,
      }));

      const items = await prisma.bounties.findMany({
        where: {
          OR: orFilters,
          ban: {
            none: {},
          },
          is_canceled: false,
          ...(input.status === 'open'
            ? {
                in_progress: true,
                is_voting: false,
              }
            : {}),
          ...(input.status === 'progress'
            ? {
                in_progress: true,
                is_voting: true,
              }
            : {}),
          ...(input.status === 'past'
            ? {
                in_progress: false,
                is_canceled: false,
              }
            : {}),
        },
        include: {
          claims: {
            take: 1,
            where: {
              ban: {
                none: {},
              },
            },
            orderBy: { is_accepted: 'desc' },
          },
          transactions: {
            take: 1,
            orderBy: { timestamp: 'desc' },
            select: { timestamp: true },
          },
        },
        orderBy: { id: 'desc' },
      });

      const getTsNumber = (b: {
        transactions?: { timestamp?: unknown }[];
      }): number => {
        const ts = b.transactions?.[0]?.timestamp;
        if (ts === undefined || ts === null) return 0;
        return Number(String(ts)) || 0;
      };

      items.sort((a, b) => {
        const at = getTsNumber(a);
        const bt = getTsNumber(b);
        if (bt === at) return b.id - a.id;
        return bt - at;
      });

      return items;
    }),

  completedCount: baseProcedure.query(async () => {
    return await prisma.claims.count({
      where: {
        is_accepted: true,
        bounty: {
          in_progress: false,
          is_canceled: false,
        },
      },
    });
  }),

  participations: baseProcedure
    .input(z.object({ bountyId: z.number(), chainId: z.number() }))
    .query(async ({ input }) => {
      return prisma.participationsBounties.findMany({
        select: {
          amount: true,
          user_address: true,
        },
        where: {
          bounty_id: input.bountyId,
          chain_id: input.chainId,
        },
      });
    }),

  claims: baseProcedure
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
          bounty_id: input.bountyId,
          chain_id: input.chainId,
          ban: {
            none: {},
          },
          ...(input.cursor ? { is_accepted: false } : {}),
          ...(input.cursor ? { id: { lt: input.cursor } } : {}),
        },
        orderBy: [!input.cursor ? { is_accepted: 'desc' } : {}, { id: 'desc' }],
        take: input.limit,
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

      let nextCursor: number | undefined = undefined;
      if (items.length === input.limit) {
        nextCursor = items[items.length - 1].id;
      }

      return {
        items,
        nextCursor,
      };
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
          bounty_id: input.bountyId,
          chain_id: input.chainId,
          ban: {
            none: {},
          },
        },
      });
    }),

  isCreated: baseProcedure
    .input(z.object({ chainId: z.number(), id: z.number() }))
    .query(async ({ input }) => {
      return prisma.bounties.findUnique({
        where: {
          id_chain_id: {
            id: input.id,
            chain_id: input.chainId,
          },
        },
      });
    }),

  isCanceled: baseProcedure
    .input(z.object({ chainId: z.number(), id: z.number() }))
    .query(async ({ input }) => {
      return prisma.bounties.findUnique({
        where: {
          id_chain_id: {
            id: input.id,
            chain_id: input.chainId,
          },
          is_canceled: true,
        },
      });
    }),

  isJoined: baseProcedure
    .input(
      z.object({
        bountyId: z.number(),
        participantAddress: addressSchema,
        chainId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return prisma.participationsBounties.findUnique({
        where: {
          user_address_bounty_id_chain_id: {
            bounty_id: input.bountyId,
            user_address: input.participantAddress.toLowerCase(),
            chain_id: input.chainId,
          },
        },
      });
    }),

  isWithdraw: baseProcedure
    .input(
      z.object({
        bountyId: z.number(),
        participantAddress: addressSchema,
        chainId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return prisma.participationsBounties.findUnique({
        where: {
          user_address_bounty_id_chain_id: {
            bounty_id: input.bountyId,
            user_address: input.participantAddress.toLowerCase(),
            chain_id: input.chainId,
          },
        },
      });
    }),

  isIssuer: baseProcedure
    .input(
      z.object({
        address: addressSchema.optional(),
        chainId: z.number(),
        bountyId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return checkIsIssuer({
        address: input.address,
        bountyId: input.bountyId,
        chainId: input.chainId,
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
        where: {
          is_canceled: false,
          ban: { none: {} },
          ...(q === ''
            ? {
                in_progress: true,
                is_voting: false,
              }
            : {
                OR: [
                  { title: { contains: q, mode: 'insensitive' } },
                  { description: { contains: q, mode: 'insensitive' } },
                ],
              }),
          ...(input.cursor ? { created_at: { lt: input.cursor } } : {}),
        },
        include: {
          claims: {
            take: 1,
            where: {
              ban: {
                none: {},
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
        take: input.limit,
      });

      let nextCursor: string | undefined = undefined;
      if (items.length === input.limit) {
        nextCursor = items[items.length - 1].created_at.toString();
      }

      return {
        items: items.map((bounty) => ({
          id: bounty.id.toString(),
          chainId: bounty.chain_id as ChainId,
          title: bounty.title,
          description: bounty.description,
          amount: bounty.amount,
          network: bounty.chain_id.toString(),
          isMultiplayer: bounty.is_multiplayer || false,
          inProgress: bounty.in_progress || false,
          hasClaims: bounty.claims.length > 0,
          isCanceled: bounty.is_canceled || false,
          claims: bounty.claims,
        })),
        nextCursor,
      };
    }),
};
