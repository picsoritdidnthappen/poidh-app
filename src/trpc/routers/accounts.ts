import prisma from 'prisma/prisma';
import { baseProcedure } from '../init';
import { z } from 'zod';
import { ChainId } from '@/utils/types';
import { addressSchema } from '../serverTypes';
import { formatEther } from 'viem';
import { fetchPrice } from '@/utils/utils';
import { fetchImageMetadata } from './claims';

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

      const normalizedItems = await Promise.all(
        items.map(async (claim) => {
          const imageMetadata = await fetchImageMetadata(claim.url);

          return {
            ...claim,
            url: imageMetadata.image,
          };
        })
      );

      return {
        items: normalizedItems,
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
        orderBy: { id: 'desc' },
        take: input.limit,
      });

      let nextCursor: number | undefined = undefined;
      if (items.length === input.limit) {
        nextCursor = items[items.length - 1].id;
      }

      const normalizedItems = await Promise.all(
        items.map(async (claim) => {
          const imageMetadata = await fetchImageMetadata(claim.url);

          return {
            ...claim,
            url: imageMetadata.image,
          };
        })
      );

      return {
        items: normalizedItems,
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
          select: { id: true, inProgress: true, isCanceled: true },
        }),
        prisma.participationsBounties.findMany({
          where: { userAddress: addr, bounty: { ban: { none: {} } } },
          select: {
            bountyId: true,
            bounty: {
              select: { id: true, inProgress: true, isCanceled: true },
            },
          },
        }),
        prisma.claims.count({
          where: { issuer: addr, isAccepted: true, ban: { none: {} } },
        }),
      ]);

      const uniqueBountyIds = new Set<number>();
      createdBounties.forEach((b) => uniqueBountyIds.add(b.id));
      contributedBounties.forEach((p) => uniqueBountyIds.add(p.bountyId));
      const bounties = uniqueBountyIds.size;

      const activeIds = new Set<number>();
      const completedIds = new Set<number>();

      createdBounties.forEach((b) => {
        if (!b.isCanceled) {
          if (b.inProgress) activeIds.add(b.id);
          else completedIds.add(b.id);
        }
      });

      contributedBounties.forEach((p) => {
        const b = p.bounty;
        if (b && !b.isCanceled) {
          if (b.inProgress) activeIds.add(b.id);
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
            id: z.number(),
            createdAt: z.coerce.number(),
            inProgress: z.boolean(),
            isCanceled: z.boolean(),
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
              extra: {
                select: { amountSort: true },
              },
            },
            orderBy: { id: 'desc' },
          })
          .then((rows) =>
            rows.map(({ claims, participations, extra, ...b }) => ({
              ...b,
              hasClaims: claims.length > 0,
              createdAt: b.createdAt.toNumber(),
              hasParticipants: participations.length > 1,
              amountSort: extra.amountSort,
            }))
          ),

        prisma.participationsBounties
          .findMany({
            where: {
              userAddress: input.address.toLowerCase(),
              bounty: { ban: { none: {} } },
            },
            include: {
              bounty: {
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
                  extra: {
                    select: { amountSort: true },
                  },
                },
              },
            },
          })
          .then((rows) =>
            rows
              .map((p) => p.bounty)
              .filter((b): b is NonNullable<typeof b> => !!b)
              .map(({ claims, participations, extra, ...b }) => ({
                ...b,
                hasClaims: claims.length > 0,
                createdAt: b.createdAt.toNumber(),
                hasParticipants: participations.length > 1,
                amountSort: extra.amountSort,
              }))
          ),
      ]);

      const mergedMap = new Map<number, (typeof createdBounties)[number]>();
      [...createdBounties, ...contributed].forEach((b) => {
        if (b) mergedMap.set(b.id, b);
      });

      const compare = (
        a: (typeof createdBounties)[number],
        b: (typeof createdBounties)[number]
      ) => {
        const aIn = a.inProgress ? 1 : 0;
        const bIn = b.inProgress ? 1 : 0;
        if (aIn !== bIn) return bIn - aIn; // in_progress desc

        const aCanc = a.isCanceled ? 1 : 0;
        const bCanc = b.isCanceled ? 1 : 0;
        if (aCanc !== bCanc) return aCanc - bCanc; // is_canceled asc

        const aTs = a.createdAt;
        const bTs = b.createdAt;
        if (aTs !== bTs) return bTs - aTs; // created_at desc

        return b.id - a.id;
      };

      let merged = Array.from(mergedMap.values()).sort(compare);

      if (input.cursor) {
        const c = input.cursor;
        merged = merged.filter((item) => {
          const iIn = item.inProgress ? 1 : 0;
          const cIn = c.inProgress ? 1 : 0;
          if (iIn !== cIn) return iIn < cIn;

          const iCanc = item.isCanceled ? 1 : 0;
          const cCanc = c.isCanceled ? 1 : 0;
          if (iCanc !== cCanc) return iCanc > cCanc;

          const iTs = item.createdAt;
          if (iTs !== c.createdAt) return iTs < c.createdAt;

          return item.id < c.id;
        });
      }

      const page = merged.slice(0, input.limit);

      let nextCursor:
        | {
            createdAt: number;
            id: number;
            inProgress: boolean;
            isCanceled: boolean;
          }
        | undefined = undefined;

      if (merged.length > input.limit) {
        const last = page[page.length - 1];
        nextCursor = {
          createdAt: last.createdAt,
          id: last.id,
          inProgress: !!last.inProgress,
          isCanceled: !!last.isCanceled,
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
      // ETH chains: Base (8453) + Arbitrum (42161) + Mainnet (1)
      const ethChainIds: ChainId[] = [8453, 42161, 1] as ChainId[];
      const degenChainId: ChainId = 666666666 as ChainId;

      const [ethParticipationsInProgress, degenParticipationsInProgress] =
        await Promise.all([
          prisma.participationsBounties.findMany({
            where: {
              userAddress: input.address.toLowerCase(),
              chainId: { in: ethChainIds as number[] },
              bounty: {
                is: {
                  inProgress: true,
                  isCanceled: false,
                  ban: { none: {} },
                },
              },
            },
            select: { amount: true },
          }),
          prisma.participationsBounties.findMany({
            where: {
              userAddress: input.address.toLowerCase(),
              chainId: degenChainId as number,
              bounty: {
                is: {
                  inProgress: true,
                  isCanceled: false,
                  ban: { none: {} },
                },
              },
            },
            select: { amount: true },
          }),
        ]);

      const [ethStats, degenStats, usersExtra] = await Promise.all([
        prisma.leaderboard.findMany({
          where: {
            address: input.address.toLowerCase(),
            chainId: { in: ethChainIds as number[] },
          },
        }),
        prisma.leaderboard.findUnique({
          where: {
            address_chainId: {
              address: input.address.toLowerCase(),
              chainId: degenChainId as number,
            },
          },
        }),
        prisma.usersExtra.findFirst({
          where: {
            address: {
              equals: input.address.toLowerCase(),
              mode: 'insensitive',
            },
          },
          select: { extraPoints: true },
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
          }) +
          Number(usersExtra?.extraPoints ?? 0)
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
            select: { id: true, chainId: true, title: true, issuer: true },
          },
          claim: {
            select: {
              id: true,
              chainId: true,
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
            { claimId: { equals: null } },
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
          bountyId: input.bountyId,
          chainId: input.chainId,
        },
      });

      return !!tx;
    }),
};
