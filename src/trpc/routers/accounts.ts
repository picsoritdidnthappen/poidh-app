import prisma from 'prisma/prisma';
import { baseProcedure } from '../init';
import { z } from 'zod';
import { ChainId } from '@/utils/types';
import { addressSchema } from '../serverTypes';
import { formatEther } from 'viem';
import { fetchPrice } from '@/utils/utils';
import type { Prisma } from 'generated/prisma/client';

export function scoreETH({
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

export function scoreDegen({
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

export function convertAmount({
  amount,
  price,
}: {
  amount: string;
  price: number;
}) {
  return {
    amountCrypto: Number(amount),
    amountUSD: price * Number(amount),
  };
}

export const accountsRouter = {
  nfts: baseProcedure
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

  claims: baseProcedure
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

  activitiesCount: baseProcedure
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

  bounties: baseProcedure
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
              claims: {
                take: 1,
                where: {
                  ban: {
                    none: {},
                  },
                },
              },
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
                  claims: {
                    take: 1,
                    where: {
                      ban: {
                        none: {},
                      },
                    },
                  },
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

      const toNum = (v: Prisma.Decimal) =>
        typeof v === 'number'
          ? v
          : v instanceof Date
          ? v.getTime()
          : v && typeof v.toNumber === 'function'
          ? v.toNumber()
          : Number(v);

      const compare = (
        a: (typeof createdBounties)[number],
        b: (typeof createdBounties)[number]
      ) => {
        const aIn = a.in_progress ? 1 : 0;
        const bIn = b.in_progress ? 1 : 0;
        if (aIn !== bIn) return bIn - aIn; // in_progress desc

        const aCanc = a.is_canceled ? 1 : 0;
        const bCanc = b.is_canceled ? 1 : 0;
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
          const iIn = item.in_progress ? 1 : 0;
          const cIn = c.in_progress ? 1 : 0;
          if (iIn !== cIn) return iIn < cIn;

          const iCanc = item.is_canceled ? 1 : 0;
          const cCanc = c.is_canceled ? 1 : 0;
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

  stats: baseProcedure
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

  activities: baseProcedure
    .input(
      z.object({
        address: z.string().optional(),
        limit: z.number().min(1).max(200).default(10),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ input }) => {
      const txs = await prisma.transactions.findMany({
        include: {
          bounty: {
            select: { id: true, chain_id: true, title: true, issuer: true },
          },
          claim: {
            select: {
              id: true,
              chain_id: true,
              title: true,
              url: true,
              issuer: true,
            },
          },
        },
        where: {
          action: { not: 'bounty canceled' },
          bounty: {
            ban: {
              none: {},
            },
          },
          OR: [
            { claim_id: { equals: null } },
            { claim: { is: { ban: { none: {} } } } },
          ],
          ...(input.address
            ? {
                address: input.address.toLowerCase(),
              }
            : {}),
          ...(input.cursor ? { timestamp: { lt: input.cursor } } : {}),
        },
        orderBy: { timestamp: 'desc' },
        take: input.limit,
      });

      let nextCursor: string | undefined = undefined;
      if (txs.length === input.limit) {
        nextCursor = txs[txs.length - 1].timestamp.toString();
      }

      return {
        items: txs,
        nextCursor,
      };
    }),

  hasVoted: baseProcedure
    .input(
      z.object({
        address: addressSchema,
        bountyId: z.number(),
        chainId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const tx = await prisma.transactions.findFirst({
        where: {
          address: input.address.toLowerCase(),
          action: 'voted',
          bounty_id: input.bountyId,
          chain_id: input.chainId,
        },
      });

      return !!tx;
    }),
};
