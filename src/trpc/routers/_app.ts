import { z } from 'zod';

import prisma from 'prisma/prisma';

import { baseProcedure, createTRPCRouter } from '../init';
import serverEnv from '@/utils/serverEnv';
import { TRPCError } from '@trpc/server';
import { formatEther, getAddress } from 'viem';
import { chains, getChainById } from '@/utils/config';
import { fetchPrice, getBanSignatureFirstLine } from '@/utils/utils';
import { ChainId, WarpcastCast } from '@/utils/types';
import axios from 'axios';
import { Leaderboard } from '@prisma/client';

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
        sortType: z.enum(['value', 'id']).default('id'),
      })
    )
    .query(async ({ input }) => {
      const sortById = input.sortType === 'id';
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
          b.amount AS "bountyAmount"
        FROM "Claims" c
        JOIN (
            SELECT id, chain_id, title, amount
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
        chainId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const bounties = (
        await prisma.bounties.findMany({
          where: {
            issuer: input.address.toLowerCase(),
            chain_id: input.chainId,
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
            claims: {
              take: 1,
            },
          },

          orderBy: { id: 'desc' },
        })
      ).map((bounty) => ({
        id: bounty.id.toString(),
        title: bounty.title,
        description: bounty.description,
        network: bounty.chain_id.toString(),
        amount: bounty.amount,
        isMultiplayer: bounty.is_multiplayer || false,
        inProgress: bounty.in_progress || false,
        hasClaims: bounty.claims.length > 0,
        isCanceled: bounty.is_canceled || false,
      }));

      const claims = (
        await prisma.claims.findMany({
          where: {
            issuer: input.address.toLowerCase(),
            chain_id: input.chainId,
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
            chain_id: input.chainId,
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
      const bounties = await prisma.bounties.findMany({
        where: {
          issuer: input.address.toLowerCase(),
          chain_id: input.chainId,
          ban: {
            none: {},
          },
          is_canceled: false,
        },
        select: {
          amount: true,
          in_progress: true,
        },
      });

      const claims = await prisma.claims.findMany({
        where: {
          issuer: input.address.toLowerCase(),
          chain_id: input.chainId,
          ban: {
            none: {},
          },
        },
        select: {
          is_accepted: true,
          bounty: {
            select: {
              id: true,
              amount: true,
            },
          },
        },
      });

      const NFTsCount = await prisma.claims.count({
        where: {
          owner: input.address.toLowerCase(),
          chain_id: input.chainId,
        },
      });

      const amountInContract = formatEther(
        bounties
          .filter((bounty) => bounty.in_progress)
          .flatMap((bounty) => BigInt(bounty.amount))
          .reduce((total, amount) => total + amount, BigInt(0))
      );

      const totalPaid = formatEther(
        bounties
          .filter((bounty) => !bounty.in_progress)
          .flatMap((bounty) => BigInt(bounty.amount))
          .reduce((total, amount) => total + amount, BigInt(0))
      );

      const totalEarn = formatEther(
        claims
          .filter((claim) => claim.is_accepted && claim.bounty)
          .flatMap((claim) => BigInt(claim.bounty?.amount ?? 0))
          .reduce((total, amount) => total + amount, BigInt(0))
      );

      const price = await fetchPrice({ currency: chain.currency });

      const result = {
        amountInContract: convertAmount({ price, amount: amountInContract }),
        totalPaid: convertAmount({ price, amount: totalPaid }),
        totalEarn: convertAmount({ price, amount: totalEarn }),
      };

      const acceptedClaimsCount = claims.filter(
        (claim) => claim.is_accepted
      ).length;

      const totalEarnedCrypto = Number(totalEarn);
      const totalPaidCrypto = Number(totalPaid);
      const poidhNFTheld = NFTsCount;

      let poidhScore: number;
      if (chain.id === 666666666) {
        // Degen chainId
        poidhScore = scoreDegen({
          earned: totalEarnedCrypto,
          paid: totalPaidCrypto,
          NFTheld: poidhNFTheld,
        });
      } else {
        // Base and Arbitrum
        poidhScore = scoreETH({
          earned: totalEarnedCrypto,
          paid: totalPaidCrypto,
          NFTheld: poidhNFTheld,
        });
      }

      return {
        ...result,
        poidhScore: Math.round(poidhScore),
        acceptedClaimsCount,
      };
    }),

  comments: baseProcedure
    .input(z.object({ url: z.string() }))
    .query(async ({ input }) => {
      const { data } = await axios.get(
        'https://api.neynar.com/v2/farcaster/cast/search',
        {
          headers: {
            'x-api-key': serverEnv.NEYNAR_API_KEY,
            'Content-Type': 'application/json',
          },
          params: {
            q: `"${input.url}"`,
            mode: 'literal',
          },
        }
      );

      const casts = data.result.casts ?? [];
      const uniqueThreadHashes = [
        ...new Set(
          casts.map((cast: { thread_hash: string }) => cast.thread_hash)
        ),
      ];
      const conversationPromises = uniqueThreadHashes.map(
        async (threadHash) => {
          try {
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
            return data.conversation.cast;
          } catch (error) {
            return null;
          }
        }
      );

      const conversationCasts = await Promise.all(conversationPromises);

      const flattenCast = (cast: WarpcastCast): WarpcastCast[] => {
        const stack = [cast];
        const all = [];

        while (stack.length) {
          const current = stack.pop()!;
          all.push(current);

          if (current.direct_replies && current.direct_replies.length > 0) {
            stack.push(...current.direct_replies);
          }
        }
        return all;
      };

      const totalCasts: WarpcastCast[] = [];
      for (const conversationCast of conversationCasts) {
        if (conversationCast) {
          totalCasts.push(...flattenCast(conversationCast));
        }
      }

      return totalCasts;
    }),

  farcasterUser: baseProcedure
    .input(z.object({ address: z.string() }))
    .query(async ({ input }) => {
      try {
        const { data } = await axios.get(
          'https://api.neynar.com/v2/farcaster/user/bulk-by-address',
          {
            headers: {
              'x-api-key': serverEnv.NEYNAR_API_KEY,
              'Content-Type': 'application/json',
            },
            params: {
              addresses: [input.address],
            },
          }
        );
        return data;
      } catch (error) {
        return null;
      }
    }),

  leaderboard: baseProcedure.query(async () => {
    const scoreETH = ({
      earned,
      paid,
      NFTheld,
    }: {
      earned: number;
      paid: number;
      NFTheld: number;
    }) => {
      return earned * 1000 + paid * 1000 + NFTheld * 10;
    };

    const scoreDegen = ({
      earned,
      paid,
      NFTheld,
    }: {
      earned: number;
      paid: number;
      NFTheld: number;
    }) => {
      return earned / 500 + paid / 500 + NFTheld * 10;
    };

    const ignoreAddresses = [
      '0x574da84cb149f9424fcf3dd21ebeef1e160cd2bf',
      '0x0e7f38ee61156d57b2b8ab4baa1648b0daa40217',
      '0xbed82560c39c133a3d64516ecda82c71b72f3cd7',
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
            ((chainScores.base ?? 0) +
              (chainScores.degen ?? 0) +
              (chainScores.arbitrum ?? 0)) /
            3,
        };

        leaderBoard.set(user.address.toLowerCase(), newScore);
      }
    );

    return Array.from(leaderBoard.entries())
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
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10);
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
