import { z } from 'zod';
import prisma from 'prisma/prisma';
import { baseProcedure, createTRPCRouter } from '../init';
import serverEnv from '@/utils/serverEnv';
import { TRPCError } from '@trpc/server';
import { formatEther, getAddress } from 'viem';
import { chains, getChainById } from '@/utils/config';
import {
  fetchPrice,
  getBanSignatureFirstLine,
  tryCatchAsync,
} from '@/utils/utils';
import { ChainId, WarpcastCast } from '@/utils/types';
import axios from 'axios';
import { Leaderboard } from '@prisma/client';
import { NeynarAPIClient, Configuration } from '@neynar/nodejs-sdk';

const config = new Configuration({
  apiKey: process.env.NEYNAR_API_KEY || '',
});

export const addressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/)
  .transform((v) => getAddress(v));

export const chainNameSchema = z
  .string()
  .regex(/^(degen|arbitrum|base)$/)
  .transform((v) => v as 'degen' | 'arbitrum' | 'base');

export const bytes32Schema = z
  .string()
  .regex(/^(0x)?[a-fA-F0-9]{64}$/)
  .transform((v) => (v.startsWith('0x') ? v : '0x' + v) as `0x${string}`);

export const bytesSchema = z
  .string()
  .regex(/^(0x)?([a-fA-F0-9]{2})*$/)
  .transform((v) => (v.startsWith('0x') ? v : '0x' + v) as `0x${string}`);

function scoreETH({
  earned,
  paid,
  NFTheld,
}: {
  earned: number;
  paid: number;
  NFTheld: number;
}) {
  return earned * 1000 + paid * 1000 + NFTheld * 10;
}

function scoreDegen({
  earned,
  paid,
  NFTheld,
}: {
  earned: number;
  paid: number;
  NFTheld: number;
}) {
  return earned / 500 + paid / 500 + NFTheld * 10;
}

export const appRouter = createTRPCRouter({
  bounty: baseProcedure
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

  bountyExtra: baseProcedure
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

  saveBountyAlbum: baseProcedure
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

  bounties: baseProcedure
    .input(
      z.object({
        chainId: z.number(),
        status: z.enum(['open', 'progress', 'past']),
        limit: z.number().min(1).max(100).default(10),
        cursor: z
          .object({
            id: z.number(),
            amount_sort: z.number(),
            ids: z.array(z.number()),
          })
          .nullish(),
        sortType: z.enum(['value', 'date']).default('date'),
      })
    )
    .query(async ({ input }) => {
      const sortById = input.sortType === 'date';
      const sortByValue = input.sortType === 'value';
      const items = await prisma.bounties.findMany({
        where: {
          chain_id: input.chainId,
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
            ? sortById
              ? { id: { lt: input.cursor.id } }
              : { amount_sort: { lte: input.cursor.amount_sort } }
            : {}),
          ...(input.cursor && !sortById && { id: { notIn: input.cursor.ids } }),
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
        orderBy: sortById
          ? { id: 'desc' }
          : sortByValue
          ? { amount_sort: 'desc' }
          : {},
        take: input.limit,
      });

      let nextCursor:
        | {
            id: (typeof items)[number]['id'];
            amount_sort: (typeof items)[number]['amount_sort'];
            ids: (typeof items)[number]['id'][];
          }
        | undefined = undefined;

      if (items.length === input.limit) {
        nextCursor = {
          id: items[items.length - 1].id,
          amount_sort: items[items.length - 1].amount_sort,
          ids: [...(input.cursor?.ids ?? []), ...items.map((item) => item.id)],
        };
      }

      return {
        items,
        nextCursor,
      };
    }),

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

  allBounties: baseProcedure
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

        const toNum = (v: unknown) =>
          typeof v === 'number'
            ? v
            : v && typeof (v as any).toNumber === 'function'
            ? (v as any).toNumber()
            : Number(v);

        nextCursor = {
          created_at: toNum(last.created_at),
          amount_sort: toNum(last.amount_sort),
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

  bountiesByAlbum: baseProcedure
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

  completedBountiesCount: baseProcedure.query(async () => {
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

  randomAcceptedClaims: baseProcedure
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

  bountyClaims: baseProcedure
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

  bountyClaimsCount: baseProcedure
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

  claim: baseProcedure
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

  accountActivities: baseProcedure
    .input(
      z.object({
        address: addressSchema,
      })
    )
    .query(async ({ input }) => {
      const createdBounties = (
        await prisma.bounties.findMany({
          where: {
            issuer: input.address.toLowerCase(),
            ban: {
              none: {},
            },
          },
          select: {
            id: true,
            title: true,
            description: true,
            chain_id: true,
            amount: true,
            is_multiplayer: true,
            in_progress: true,
            is_canceled: true,
            created_at: true,
            claims: {
              take: 1,
            },
          },
          orderBy: { id: 'desc' },
        })
      ).map((bounty) => ({
        id: bounty.id.toString(),
        chainId: bounty.chain_id as ChainId,
        title: bounty.title,
        description: bounty.description,
        network: bounty.chain_id.toString(),
        amount: bounty.amount,
        isMultiplayer: bounty.is_multiplayer || false,
        inProgress: bounty.in_progress || false,
        hasClaims: bounty.claims.length > 0,
        createdAt: bounty.created_at,
        isCanceled: bounty.is_canceled || false,
      }));

      const contributedBounties = (
        await prisma.participationsBounties.findMany({
          where: {
            user_address: input.address.toLowerCase(),
          },
          include: {
            bounty: {
              select: {
                id: true,
                title: true,
                description: true,
                chain_id: true,
                amount: true,
                is_multiplayer: true,
                in_progress: true,
                is_canceled: true,
                created_at: true,
                claims: { take: 1 },
              },
            },
          },
        })
      ).map((p) => {
        const bounty = p.bounty;
        if (bounty) {
          return {
            id: bounty.id.toString(),
            chainId: bounty.chain_id as ChainId,
            title: bounty.title,
            description: bounty.description,
            network: bounty.chain_id.toString(),
            amount: bounty.amount,
            isMultiplayer: bounty.is_multiplayer || false,
            inProgress: bounty.in_progress || false,
            hasClaims: (bounty.claims ?? []).length > 0,
            isCanceled: bounty.is_canceled || false,
            createdAt: bounty.created_at,
          };
        }
      });

      const mergedBountiesMap = new Map<
        string,
        (typeof createdBounties)[number]
      >();
      [...createdBounties, ...contributedBounties].forEach((b) => {
        if (b) {
          mergedBountiesMap.set(b.id, b);
        }
      });
      const bounties = Array.from(mergedBountiesMap.values()).sort((a, b) => {
        if (a.isCanceled !== b.isCanceled) {
          return a.isCanceled ? 1 : -1;
        }

        if (a.inProgress !== b.inProgress) {
          return a.inProgress ? -1 : 1;
        }

        return Number(b.createdAt) - Number(a.createdAt);
      });

      const claims = (
        await prisma.claims.findMany({
          where: {
            issuer: input.address.toLowerCase(),
            ban: {
              none: {},
            },
          },
          select: {
            id: true,
            title: true,
            description: true,
            is_accepted: true,
            url: true,
            bounty: {
              select: {
                id: true,
                amount: true,
              },
            },
            issuer: true,
            owner: true,
          },
          orderBy: { id: 'desc' },
        })
      ).map((claim) => {
        const bountyId = claim.bounty?.id.toString() ?? '';
        return {
          id: claim.id.toString(),
          title: claim.title,
          description: claim.description,
          issuer: claim.issuer,
          bountyId,
          accepted: claim.is_accepted || false,
          url: claim.url,
        };
      });

      const NFTs = (
        await prisma.claims.findMany({
          where: {
            owner: input.address.toLowerCase(),
          },
          select: {
            id: true,
            url: true,
            title: true,
            description: true,
            issuer: true,
            bounty: {
              select: {
                id: true,
              },
            },
          },
          orderBy: { id: 'desc' },
        })
      ).map((NFT) => ({
        id: NFT.id.toString(),
        url: NFT.url,
        title: NFT.title,
        description: NFT.description,
        bountyId: NFT.bounty?.id.toString() ?? '',
        issuer: NFT.issuer,
      }));

      return {
        bounties,
        claims,
        NFTs,
      };
    }),

  accountNFTs: baseProcedure
    .input(
      z.object({
        address: addressSchema,
        limit: z.number().min(1).max(100).default(9),
        cursor: z.number().nullish(), // claim id
      })
    )
    .query(async ({ input }) => {
      const items = await prisma.claims.findMany({
        where: {
          owner: input.address.toLowerCase(),
        },
        select: {
          id: true,
          chain_id: true,
          url: true,
          title: true,
          description: true,
          issuer: true,
          bounty: {
            select: { id: true },
          },
        },
        ...(input.cursor
          ? {
              where: {
                owner: input.address.toLowerCase(),
                id: { lt: input.cursor },
              },
            }
          : {}),
        orderBy: { id: 'desc' },
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

  accountClaims: baseProcedure
    .input(
      z.object({
        address: addressSchema,
        limit: z.number().min(1).max(100).default(9),
        cursor: z.number().nullish(), // claim id
      })
    )
    .query(async ({ input }) => {
      const items = await prisma.claims.findMany({
        where: {
          issuer: input.address.toLowerCase(),
          ban: { none: {} },
          ...(input.cursor ? { id: { lt: input.cursor } } : {}),
        },
        select: {
          id: true,
          chain_id: true,
          title: true,
          description: true,
          is_accepted: true,
          url: true,
          issuer: true,
          bounty: { select: { id: true } },
        },
        orderBy: { id: 'desc' },
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

  accountActivitiesCount: baseProcedure
    .input(
      z.object({
        address: addressSchema,
      })
    )
    .query(async ({ input }) => {
      const addr = input.address.toLowerCase();

      const [
        nfts,
        claims,
        createdBounties,
        contributedBounties,
        completedClaims,
      ] = await Promise.all([
        prisma.claims.count({ where: { owner: addr } }),
        prisma.claims.count({ where: { issuer: addr, ban: { none: {} } } }),
        prisma.bounties.findMany({
          where: { issuer: addr, ban: { none: {} } },
          select: { id: true, in_progress: true, is_canceled: true },
        }),
        prisma.participationsBounties.findMany({
          where: { user_address: addr, bounty: { ban: { none: {} } } },
          select: {
            bounty_id: true,
            bounty: {
              select: { id: true, in_progress: true, is_canceled: true },
            },
          },
        }),
        prisma.claims.count({
          where: { issuer: addr, is_accepted: true, ban: { none: {} } },
        }),
      ]);

      const uniqueBountyIds = new Set<number>();
      createdBounties.forEach((b) => uniqueBountyIds.add(b.id));
      contributedBounties.forEach((p) => uniqueBountyIds.add(p.bounty_id));
      const bounties = uniqueBountyIds.size;

      const activeIds = new Set<number>();
      const completedIds = new Set<number>();

      createdBounties.forEach((b) => {
        if (!b.is_canceled) {
          if (b.in_progress) activeIds.add(b.id);
          else completedIds.add(b.id);
        }
      });

      contributedBounties.forEach((p) => {
        const b = p.bounty;
        if (b && !b.is_canceled) {
          if (b.in_progress) activeIds.add(b.id);
          else completedIds.add(b.id);
        }
      });

      const activeBounties = activeIds.size;
      const completedBounties = completedIds.size;

      return {
        nfts,
        claims,
        bounties,
        activeBounties,
        completedBounties,
        completedClaims,
      };
    }),

  accountBounties: baseProcedure
    .input(
      z.object({
        address: addressSchema,
        limit: z.number().min(1).max(100).default(9),
        cursor: z
          .object({
            created_at: z.coerce.number(),
            id: z.number(),
            in_progress: z.boolean(),
            is_canceled: z.boolean(),
          })
          .nullish(),
      })
    )
    .query(async ({ input }) => {
      const [createdBounties, contributed] = await Promise.all([
        prisma.bounties
          .findMany({
            where: {
              issuer: input.address.toLowerCase(),
              ban: { none: {} },
            },
            select: {
              id: true,
              title: true,
              description: true,
              chain_id: true,
              amount: true,
              is_multiplayer: true,
              in_progress: true,
              is_canceled: true,
              created_at: true,
              claims: { take: 1 },
            },
            orderBy: { id: 'desc' },
          })
          .then((rows) =>
            rows.map((b) => ({
              id: b.id,
              chain_id: b.chain_id,
              title: b.title,
              description: b.description,
              amount: b.amount,
              is_multiplayer: b.is_multiplayer || false,
              in_progress: b.in_progress || false,
              is_canceled: b.is_canceled || false,
              created_at: b.created_at,
              claims: b.claims,
            }))
          ),
        prisma.participationsBounties
          .findMany({
            where: {
              user_address: input.address.toLowerCase(),
              bounty: { ban: { none: {} } },
            },
            include: {
              bounty: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  chain_id: true,
                  amount: true,
                  is_multiplayer: true,
                  in_progress: true,
                  is_canceled: true,
                  created_at: true,
                  claims: { take: 1 },
                },
              },
            },
          })
          .then((rows) =>
            rows
              .map((p) => p.bounty)
              .filter((b): b is NonNullable<typeof b> => !!b)
              .map((b) => ({
                id: b.id,
                chain_id: b.chain_id,
                title: b.title,
                description: b.description,
                amount: b.amount,
                is_multiplayer: b.is_multiplayer || false,
                in_progress: b.in_progress || false,
                is_canceled: b.is_canceled || false,
                created_at: b.created_at,
                claims: b.claims,
              }))
          ),
      ]);

      const mergedMap = new Map<number, (typeof createdBounties)[number]>();
      [...createdBounties, ...contributed].forEach((b) => {
        if (b) mergedMap.set(b.id, b);
      });

      const toNum = (v: unknown) =>
        typeof v === 'number'
          ? v
          : v instanceof Date
          ? v.getTime()
          : v && typeof (v as any).toNumber === 'function'
          ? (v as any).toNumber()
          : Number(v);

      const compare = (
        a: (typeof createdBounties)[number],
        b: (typeof createdBounties)[number]
      ) => {
        const aIn = !!a.in_progress ? 1 : 0;
        const bIn = !!b.in_progress ? 1 : 0;
        if (aIn !== bIn) return bIn - aIn; // in_progress desc

        const aCanc = !!a.is_canceled ? 1 : 0;
        const bCanc = !!b.is_canceled ? 1 : 0;
        if (aCanc !== bCanc) return aCanc - bCanc; // is_canceled asc

        const aTs = toNum(a.created_at);
        const bTs = toNum(b.created_at);
        if (aTs !== bTs) return bTs - aTs; // created_at desc

        return b.id - a.id;
      };

      let merged = Array.from(mergedMap.values()).sort(compare);

      if (input.cursor) {
        const c = input.cursor;
        merged = merged.filter((item) => {
          const iIn = !!item.in_progress ? 1 : 0;
          const cIn = !!c.in_progress ? 1 : 0;
          if (iIn !== cIn) return iIn < cIn;

          const iCanc = !!item.is_canceled ? 1 : 0;
          const cCanc = !!c.is_canceled ? 1 : 0;
          if (iCanc !== cCanc) return iCanc > cCanc;

          const iTs = toNum(item.created_at);
          if (iTs !== c.created_at) return iTs < c.created_at;

          return item.id < c.id;
        });
      }

      const page = merged.slice(0, input.limit);

      let nextCursor:
        | {
            created_at: number;
            id: number;
            in_progress: boolean;
            is_canceled: boolean;
          }
        | undefined = undefined;

      if (merged.length > input.limit) {
        const last = page[page.length - 1];
        nextCursor = {
          created_at: toNum(last.created_at),
          id: last.id,
          in_progress: !!last.in_progress,
          is_canceled: !!last.is_canceled,
        };
      }

      return {
        items: page,
        nextCursor,
      };
    }),

  isBountyCreated: baseProcedure
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

  isClaimCreated: baseProcedure
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

  isBountyCanceled: baseProcedure
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

  isAcceptedClaim: baseProcedure
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

  isJoinedBounty: baseProcedure
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

  isWithdrawBounty: baseProcedure
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

  isAdmin: baseProcedure
    .input(
      z.object({
        address: addressSchema.optional(),
      })
    )
    .query(({ input }) => {
      return checkIsAdmin(input.address);
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

  banBounty: baseProcedure
    .input(
      z.object({
        id: z.number(),
        chainId: z.number(),
        address: addressSchema,
        signature: bytesSchema,
        chainName: chainNameSchema,
        message: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const expectedMessage = getBanSignatureFirstLine({
        id: input.id,
        chainId: input.chainId,
        type: 'bounty',
      });

      if (!input.message.startsWith(expectedMessage)) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Invalid message',
        });
      }

      const isAdmin = checkIsAdmin(input.address);
      const chain = chains['base'];

      if (!isAdmin) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Not authorized to perform this action',
        });
      }

      const isValid = await chain.provider.verifyMessage({
        address: input.address,
        message: input.message,
        signature: input.signature,
      });

      if (!isValid) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Signature is invalid',
        });
      }

      await prisma.ban.create({
        data: {
          chain_id: input.chainId,
          bounty_id: input.id,
          banned_by: input.address.toLowerCase(),
        },
      });
    }),

  banClaim: baseProcedure
    .input(
      z.object({
        id: z.number(),
        chainId: z.number(),
        bountyId: z.number(),
        address: addressSchema,
        signature: bytesSchema,
        chainName: chainNameSchema,
        message: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const expectedMessage = getBanSignatureFirstLine({
        id: input.id,
        chainId: input.chainId,
        type: 'claim',
      });

      if (!input.message.startsWith(expectedMessage)) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Invalid message',
        });
      }

      const isIssuer = await checkIsIssuer({
        address: input.address,
        bountyId: input.bountyId,
        chainId: input.chainId,
      });
      const isAdmin = checkIsAdmin(input.address);
      const chain = chains['base'];

      if (!isAdmin && !isIssuer) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Not authorized to perform this action',
        });
      }

      const isValid = await chain.provider.verifyMessage({
        address: input.address,
        message: input.message,
        signature: input.signature,
      });

      if (!isValid) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Signature is invalid',
        });
      }

      await prisma.ban.create({
        data: {
          chain_id: input.chainId,
          banned_by: input.address.toLowerCase(),
          claim_id: input.id,
        },
      });
    }),

  accountInfo: baseProcedure
    .input(
      z.object({
        address: addressSchema,
        chainId: z.number().transform((num) => num as ChainId),
      })
    )
    .query(async ({ input }) => {
      const chain = getChainById({
        chainId: input.chainId as 666666666 | 42161 | 8453,
      });
      const participationsInProgress =
        await prisma.participationsBounties.findMany({
          where: {
            user_address: input.address.toLowerCase(),
            chain_id: input.chainId,
            bounty: {
              is: {
                in_progress: true,
                is_canceled: false,
                ban: { none: {} },
              },
            },
          },
          select: { amount: true },
        });

      const stats = await prisma.leaderboard.findUnique({
        where: {
          address_chain_id: {
            address: input.address.toLowerCase(),
            chain_id: chain.id,
          },
        },
      });

      const amountInContract = formatEther(
        participationsInProgress
          .flatMap((p) => BigInt(p.amount))
          .reduce((total, amount) => total + amount, BigInt(0))
      );

      const price = await fetchPrice({ currency: chain.currency });

      const result = {
        amountInContract: convertAmount({ price, amount: amountInContract }),
        totalPaid: convertAmount({
          price,
          amount: stats?.paid.toString() ?? '0',
        }),
        totalEarn: convertAmount({
          price,
          amount: stats?.earned.toString() ?? '0',
        }),
      };

      const acceptedClaimsCount = await prisma.claims.count({
        where: { issuer: input.address, is_accepted: true, chain_id: chain.id },
      });

      let poidhScore: number;
      if (chain.id === 666666666) {
        // Degen chainId
        poidhScore = scoreDegen({
          earned: stats?.earned ?? 0,
          paid: stats?.paid ?? 0,
          NFTheld: stats?.nfts ?? 0,
        });
      } else {
        // Base and Arbitrum
        poidhScore = scoreETH({
          earned: stats?.earned ?? 0,
          paid: stats?.paid ?? 0,
          NFTheld: stats?.nfts ?? 0,
        });
      }

      return {
        ...result,
        poidhScore: Math.round(poidhScore),
        acceptedClaimsCount,
      };
    }),

  accountInfoSplit: baseProcedure
    .input(
      z.object({
        address: addressSchema,
      })
    )
    .query(async ({ input }) => {
      // ETH chains: Base (8453) + Arbitrum (42161)
      const ethChainIds: ChainId[] = [8453, 42161] as ChainId[];
      const degenChainId: ChainId = 666666666 as ChainId;

      const [ethParticipationsInProgress, degenParticipationsInProgress] =
        await Promise.all([
          prisma.participationsBounties.findMany({
            where: {
              user_address: input.address.toLowerCase(),
              chain_id: { in: ethChainIds as number[] },
              bounty: {
                is: {
                  in_progress: true,
                  is_canceled: false,
                  ban: { none: {} },
                },
              },
            },
            select: { amount: true },
          }),
          prisma.participationsBounties.findMany({
            where: {
              user_address: input.address.toLowerCase(),
              chain_id: degenChainId as number,
              bounty: {
                is: {
                  in_progress: true,
                  is_canceled: false,
                  ban: { none: {} },
                },
              },
            },
            select: { amount: true },
          }),
        ]);

      const [ethStats, degenStats] = await Promise.all([
        prisma.leaderboard.findMany({
          where: {
            address: input.address.toLowerCase(),
            chain_id: { in: ethChainIds as number[] },
          },
        }),
        prisma.leaderboard.findUnique({
          where: {
            address_chain_id: {
              address: input.address.toLowerCase(),
              chain_id: degenChainId as number,
            },
          },
        }),
      ]);

      const ethInContractWei = ethParticipationsInProgress
        .flatMap((p) => BigInt(p.amount))
        .reduce((acc, v) => acc + v, BigInt(0));
      const degenInContractWei = degenParticipationsInProgress
        .flatMap((p) => BigInt(p.amount))
        .reduce((acc, v) => acc + v, BigInt(0));

      const ethAmountInContract = formatEther(ethInContractWei);
      const degenAmountInContract = formatEther(degenInContractWei);

      const totalEthPaid = (ethStats ?? []).reduce(
        (acc, s) => acc + Number(s.paid ?? 0),
        0
      );
      const totalEthEarn = (ethStats ?? []).reduce(
        (acc, s) => acc + Number(s.earned ?? 0),
        0
      );

      const totalDegenPaid = Number(degenStats?.paid ?? 0);
      const totalDegenEarn = Number(degenStats?.earned ?? 0);

      const totalEthNfts = (ethStats ?? []).reduce(
        (acc, s) => acc + Number(s.nfts ?? 0),
        0
      );

      const [ethPrice, degenPrice] = await Promise.all([
        fetchPrice({ currency: 'eth' }),
        fetchPrice({ currency: 'degen' }),
      ]);

      const poidhScore: number = Math.round(
        scoreDegen({
          earned: totalDegenEarn ?? 0,
          paid: totalDegenPaid ?? 0,
          NFTheld: Number(degenStats?.nfts ?? 0),
        }) +
          scoreETH({
            earned: totalEthEarn ?? 0,
            paid: totalEthPaid ?? 0,
            NFTheld: totalEthNfts,
          })
      );

      return {
        poidhScore: poidhScore.toFixed(0),
        eth: {
          amountInContract: convertAmount({
            price: ethPrice,
            amount: ethAmountInContract,
          }),
          totalPaid: convertAmount({
            price: ethPrice,
            amount: totalEthPaid.toString(),
          }),
          totalEarn: convertAmount({
            price: ethPrice,
            amount: totalEthEarn.toString(),
          }),
        },
        degen: {
          amountInContract: convertAmount({
            price: degenPrice,
            amount: degenAmountInContract,
          }),
          totalPaid: convertAmount({
            price: degenPrice,
            amount: totalDegenPaid.toString(),
          }),
          totalEarn: convertAmount({
            price: degenPrice,
            amount: totalDegenEarn.toString(),
          }),
        },
      };
    }),

  //TODO: create zod schema for the responses (Neynar API)
  comments: baseProcedure
    .input(
      z.object({ url: z.string(), limit: z.number().optional().default(20) })
    )
    .query(async ({ input }) => {
      const neynarApiKey = serverEnv.NEYNAR_API_KEY;
      if (!neynarApiKey) {
        return [];
      }

      const { data } = await axios.get(
        'https://api.neynar.com/v2/farcaster/cast/search',
        {
          headers: {
            'x-api-key': neynarApiKey,
            'Content-Type': 'application/json',
          },
          params: {
            q: `"${input.url}"`,
            mode: 'literal',
            limit: input.limit,
          },
        }
      );

      const casts =
        data.result.casts?.filter(
          (cast: { hash: string; thread_hash: string }) =>
            cast.hash === cast.thread_hash
        ) ?? [];
      const uniqueThreadHashes = [
        ...new Set(
          casts.map((cast: { thread_hash: string }) => cast.thread_hash)
        ),
      ];
      const flattenCast = (cast: WarpcastCast): WarpcastCast[] => {
        const stack = [cast];
        const all: WarpcastCast[] = [];

        while (stack.length) {
          const current = stack.pop();
          if (!current) continue;
          all.push(current);

          if (current.direct_replies?.length) {
            stack.push(...current.direct_replies);
          }
        }
        return all;
      };

      const totalCasts: WarpcastCast[] = [];
      for (const threadHash of uniqueThreadHashes) {
        if (totalCasts.length >= 20) break;

        const [conversationCast] = await tryCatchAsync(async () => {
          const { data } = await axios.get(
            'https://api.neynar.com/v2/farcaster/cast/conversation',
            {
              headers: {
                'x-api-key': serverEnv.NEYNAR_API_KEY,
                'Content-Type': 'application/json',
              },
              params: {
                type: 'hash',
                identifier: threadHash,
                reply_depth: 3,
              },
            }
          );
          return data.conversation.cast as WarpcastCast;
        });

        if (conversationCast) {
          totalCasts.push(...flattenCast(conversationCast));
        }
      }

      return totalCasts;
    }),

  usersDataNeynar: baseProcedure
    .input(z.object({ addresses: z.array(z.string()) }))
    .query(async ({ input }) => {
      if (input.addresses.length === 0) {
        return {};
      }

      const client = new NeynarAPIClient(config);
      const users = await client.fetchBulkUsersByEthOrSolAddress({
        addresses: input.addresses,
      });

      return users;
    }),

  leaderboard: baseProcedure
    .input(
      z
        .object({
          userAddress: addressSchema.optional(),
          page: z.number().min(1).default(1),
          limit: z.number().min(1).max(10).default(10),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const page = input?.page ?? 1;
      const limit = input?.limit ?? 10;
      const maxUsers = 100;
      const offset = (page - 1) * limit;
      const ignoreAddresses = [
        '0x574da84cb149f9424fcf3dd21ebeef1e160cd2bf',
        '0x0e7f38ee61156d57b2b8ab4baa1648b0daa40217',
        '0xbed82560c39c133a3d64516ecda82c71b72f3cd7',
        '0x7c7f6cb2dab9de9b242eeec29d2f61bd7d9750e0',
        '0x10fc964ef70c8467cd8c53e9ed9347422adf96a8',
      ];

      const fetchTop = (
        chainId: number,
        orderCol: 'paid' | 'earned' | 'nfts',
        take = 30
      ) =>
        prisma.leaderboard.findMany({
          where: {
            AND: [
              { chain_id: chainId },
              { address: { not: { in: ignoreAddresses } } },
            ],
          },
          orderBy: { [orderCol]: 'desc' },
          take,
        });

      const buildLeaderboard = async (chainId: number) => {
        const [byPaid, byEarned, byNfts] = await Promise.all([
          fetchTop(chainId, 'paid'),
          fetchTop(chainId, 'earned'),
          fetchTop(chainId, 'nfts'),
        ]);

        const uniq = new Map<string, Leaderboard>();
        [...byPaid, ...byEarned, ...byNfts].forEach((row) =>
          uniq.set(row.address.toLowerCase(), row)
        );

        return Array.from(uniq.values());
      };

      const [leaderboardBase, leaderboardDegen, leaderboardArbitrum] =
        await Promise.all([
          buildLeaderboard(8453),
          buildLeaderboard(666666666),
          buildLeaderboard(42161),
        ]);

      const leaderBoard = new Map<
        string,
        {
          degen: number | undefined;
          base: number | undefined;
          arbitrum: number | undefined;
          total: number;
        }
      >();

      [...leaderboardBase, ...leaderboardDegen, ...leaderboardArbitrum].forEach(
        (user) => {
          const initialScore = leaderBoard.get(user.address.toLowerCase());

          const chainScores: {
            base: number | undefined;
            degen: number | undefined;
            arbitrum: number | undefined;
          } = {
            base:
              initialScore?.base ??
              (user.chain_id === 8453
                ? scoreETH({
                    earned: user.earned,
                    paid: user.paid,
                    NFTheld: user.nfts,
                  })
                : initialScore?.base),
            degen:
              initialScore?.degen ??
              (user.chain_id === 666666666
                ? scoreDegen({
                    earned: user.earned,
                    paid: user.paid,
                    NFTheld: user.nfts,
                  })
                : initialScore?.degen),
            arbitrum:
              initialScore?.arbitrum ??
              (user.chain_id === 42161
                ? scoreETH({
                    earned: user.earned,
                    paid: user.paid,
                    NFTheld: user.nfts,
                  })
                : initialScore?.arbitrum),
          };

          const newScore = {
            ...chainScores,
            total:
              (chainScores.base ?? 0) +
              (chainScores.degen ?? 0) +
              (chainScores.arbitrum ?? 0),
          };

          leaderBoard.set(user.address.toLowerCase(), newScore);
        }
      );

      const sortedLeaderboard = Array.from(leaderBoard.entries())
        .map(
          ([address, scores]) =>
            [
              address,
              {
                base: Math.round(scores.base ?? 0),
                degen: Math.round(scores.degen ?? 0),
                arbitrum: Math.round(scores.arbitrum ?? 0),
                total: Math.round(scores.total ?? 0),
              },
            ] as [
              string,
              { base: number; degen: number; arbitrum: number; total: number }
            ]
        )
        .sort((a, b) => b[1].total - a[1].total);

      let userData: {
        rank: number;
        data: [
          string,
          { base: number; degen: number; arbitrum: number; total: number }
        ];
      } | null = null;

      if (input?.userAddress) {
        const userRows = await prisma.leaderboard.findMany({
          where: {
            address: input.userAddress.toLowerCase(),
            chain_id: { in: [8453, 666666666, 42161] },
          },
        });

        if (userRows.length > 0) {
          let baseScore: number | undefined = undefined;
          let degenScore: number | undefined = undefined;
          let arbitrumScore: number | undefined = undefined;

          for (const row of userRows) {
            if (row.chain_id === 8453) {
              baseScore = scoreETH({
                earned: row.earned,
                paid: row.paid,
                NFTheld: row.nfts,
              });
            } else if (row.chain_id === 666666666) {
              degenScore = scoreDegen({
                earned: row.earned,
                paid: row.paid,
                NFTheld: row.nfts,
              });
            } else if (row.chain_id === 42161) {
              arbitrumScore = scoreETH({
                earned: row.earned,
                paid: row.paid,
                NFTheld: row.nfts,
              });
            }
          }

          const totalScore =
            (baseScore ?? 0) + (degenScore ?? 0) + (arbitrumScore ?? 0);

          const rounded = {
            base: Math.round(baseScore ?? 0),
            degen: Math.round(degenScore ?? 0),
            arbitrum: Math.round(arbitrumScore ?? 0),
            total: Math.round(totalScore),
          };

          const higherCount = sortedLeaderboard.filter(
            ([, s]) => s.total > rounded.total
          ).length;
          const rank = higherCount + 1;

          userData = {
            rank,
            data: [input.userAddress, rounded],
          };
        }
      }

      const limitedLeaderboard = sortedLeaderboard.slice(0, maxUsers);
      const paginatedLeaderboard = limitedLeaderboard.slice(
        offset,
        offset + limit
      );

      const totalUsers = Math.min(sortedLeaderboard.length, maxUsers);
      const totalPages = Math.ceil(totalUsers / limit);

      return {
        leaderboard: paginatedLeaderboard,
        userData,
        pagination: {
          currentPage: page,
          totalPages,
          totalUsers,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    }),

  generateBounty: baseProcedure.mutation(async () => {
    const PROMPT = `Generate unique, creative, and fun bounty ideas for the "Pics or It Didn't Happen" (poidh) website. Each bounty should encourage users to engage in amusing, interesting, or surprising activities that can be easily documented with a photo, screenshot, or video.
               Ensure the ideas are diverse, spanning different themes such as real-life actions, contributions, playful tasks, or simple creative(could be developer) projects.
               Ideas must remain achievable and enjoyable for users of all skill levels. A user should share result either in video or in photo. Include:
               Title: A short, catchy description of the bounty (max 50 characters).
               Description: A clear and engaging explanation of what the user must do to complete the bounty (max 350 characters).
               Return the ideas in JSON format like this:
               { 'title': '...', 'description': '...' }.`;

    const OPENAI_API_KEY = serverEnv.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Missing OpenAI API key',
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: PROMPT,
          },
          {
            role: 'user',
            content: 'Generate a bounty idea for a person to do.',
          },
        ],
        max_tokens: 100,
        temperature: 1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const data = await response.json();

    const responseSchema = z.object({
      title: z.string(),
      description: z.string(),
    });

    const parsed = responseSchema.safeParse(
      JSON.parse(data.choices[0].message.content)
    );

    if (!parsed.success) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to parse bounty idea',
      });
    }

    return parsed.data;
  }),

  albums: baseProcedure
    .input(
      z.object({
        contains: z.string(),
      })
    )
    .query(async ({ input }) => {
      const result = await prisma.$queryRaw<
        Array<{
          album: string;
          _count: bigint;
        }>
      >`
        SELECT 
          LOWER(TRIM(album)) as album,
          COUNT(*)::bigint as _count
        FROM "BountiesExtra"
        WHERE TRIM(LOWER(album)) LIKE ${`%${input.contains.toLowerCase()}%`}
          AND album IS NOT NULL
        GROUP BY LOWER(TRIM(album))
        ORDER BY COUNT(*) DESC
      `;

      return result.map((item) => ({
        album: item.album,
        _count: {
          album: Number(item._count),
        },
      }));
    }),

  bountiesByKeyword: baseProcedure
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

  trendingAlbums: baseProcedure
    .input(
      z.object({
        limit: z.number().default(10).optional(),
      })
    )
    .query(async ({ input }) => {
      const result = await prisma.$queryRaw<
        Array<{
          album: string;
          count: bigint;
          latest_timestamp: string;
        }>
      >`
        SELECT 
          MIN(be.album) as album,
          COUNT(be.album)::bigint as count,
          MAX(b.created_at)::text as latest_timestamp
        FROM "BountiesExtra" be
        INNER JOIN "Bounties" b ON be.bounty_id = b.id AND be.chain_id = b.chain_id
        LEFT JOIN "Ban" ban ON b.id = ban.bounty_id AND b.chain_id = ban.chain_id
        WHERE b.is_canceled = false 
          AND ban.id IS NULL
          AND b.in_progress = true
          AND b.is_voting = false
          AND be.album IS NOT NULL
          AND TRIM(be.album) != ''
        GROUP BY LOWER(be.album)
        ORDER BY MAX(b.created_at) DESC
        LIMIT ${input.limit || 10}
      `;

      return result.map((album) => ({
        name: album.album,
        count: Number(album.count),
      }));
    }),
});

export function checkIsAdmin(address?: string) {
  if (!address) {
    return false;
  }
  return serverEnv.ADMINS.includes(address.toLocaleLowerCase());
}

export async function checkIsIssuer({
  bountyId,
  chainId,
  address,
}: {
  bountyId: number;
  chainId: number;
  address?: `0x${string}`;
}) {
  if (!address) {
    return false;
  }

  const bounty = await prisma.bounties.findUniqueOrThrow({
    where: { id_chain_id: { id: bountyId, chain_id: chainId } },
  });

  return address.toLocaleLowerCase() === bounty.issuer;
}

function convertAmount({ amount, price }: { amount: string; price: number }) {
  return {
    amountCrypto: Number(amount),
    amountUSD: price * Number(amount),
  };
}

export type AppRouter = typeof appRouter;
