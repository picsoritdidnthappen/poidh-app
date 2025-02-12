import { z } from 'zod';

import prisma from 'prisma/prisma';

import { baseProcedure, createTRPCRouter } from '../init';
import serverEnv from '@/utils/serverEnv';
import { TRPCError } from '@trpc/server';
import { formatEther, getAddress } from 'viem';
import { chains, getChainById } from '@/utils/config';
import { fetchPrice, getBanSignatureFirstLine } from '@/utils/utils';
import { ChainId } from '@/utils/types';

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
            is_canceled: false,
          },
          select: {
            id: true,
            title: true,
            description: true,
            chain_id: true,
            amount: true,
            is_multiplayer: true,
            in_progress: true,
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
        return {
          id: claim.id.toString(),
          title: claim.title,
          description: claim.description,
          issuer: claim.issuer,
          bountyId: claim.bounty!.id.toString(),
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
        bountyId: NFT.bounty!.id.toString(),
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
            user_address: input.participantAddress,
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
            user_address: input.participantAddress,
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
      const address = input.address.toLowerCase();
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
          .filter((claim) => claim.is_accepted)
          .flatMap((claim) => BigInt(claim.bounty!.amount))
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

      const improvedPoidhScore =
        0.5 * result.totalEarn.amountUSD +
        0.3 * result.totalPaid.amountUSD +
        0.1 * result.amountInContract.amountUSD +
        5 * NFTsCount +
        10 * acceptedClaimsCount;

      return {
        ...result,
        poidhScore: Math.round(improvedPoidhScore),
        acceptedClaimsCount,
      };
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
