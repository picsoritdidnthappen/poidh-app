import { z } from 'zod';
import { baseProcedure } from '../init';
import prisma from 'prisma/prisma';
import { addressSchema } from '../serverTypes';
import { checkIsAdmin, checkIsIssuer } from './admin';
import { getEverHadExternalContributor } from './web3';
import { TRPCError } from '@trpc/server';

/** How long after a bounty is created its album can still be set. */
const ALBUM_WINDOW_MS = 5 * 60 * 1000;

/**
 * Escapes LIKE wildcards. Prisma's `contains` passes `%` and `_` through, so
 * a search for "%%" matched every bounty instead of the literal text.
 */
export function likeLiteral(text: string): string {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}

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

      const { claims, participations, extra, ...bountyData } = bounty;
      const { amountSort, ...extraData } = extra;

      return {
        ...bountyData,
        createdAt: bountyData.createdAt.toNumber(),
        extra: extraData,
        hasClaims: claims.length > 0,
        hasParticipants: participations.length > 1,
        amountSort,
      };
    }),

  // Kept out of `fetch` because it's an onchain read: the bounty page is
  // server-rendered from `fetch`, and only the issuer needs this
  mustUseVoteFlow: baseProcedure
    .input(z.object({ id: z.number(), chainId: z.number() }))
    .query(async ({ input }) => {
      const bounty = await prisma.bounties.findUniqueOrThrow({
        where: {
          id_chainId: {
            ...input,
          },
        },
        select: {
          chainId: true,
          onChainId: true,
          isMultiplayer: true,
          participations: {
            select: { userAddress: true },
            take: 2,
          },
        },
      });

      const everHadExternalContributor = bounty.isMultiplayer
        ? await getEverHadExternalContributor({
            chainId: bounty.chainId,
            bountyId: bounty.onChainId,
          })
        : false;

      return everHadExternalContributor ?? bounty.participations.length > 1;
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

  /**
   * Puts a bounty in an album. A signed-in admin can set or change it at any
   * time. Anyone else, with no sign-in needed, can only set it once, while
   * the bounty has no album yet and was created in the last few minutes.
   */
  addToAlbum: baseProcedure
    .input(
      z.object({
        bountyId: z.number(),
        chainId: z.number(),
        album: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.getSession();
      const isAdmin = checkIsAdmin(session?.address);

      if (!isAdmin) {
        if (!input.album.trim()) {
          return null;
        }

        const bounty = await prisma.bounties.findUnique({
          where: {
            id_chainId: { id: input.bountyId, chainId: input.chainId },
          },
          select: { createdAt: true, extra: { select: { album: true } } },
        });

        if (!bounty) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Bounty not found',
          });
        }

        const createdAtMs = Number(bounty.createdAt) * 1000;
        const isNew = Date.now() - createdAtMs < ALBUM_WINDOW_MS;
        const hasAlbum = !!bounty.extra?.album?.trim();

        if (!isNew || hasAlbum) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'The album can only be set when the bounty is created',
          });
        }
      }

      return prisma.bountiesExtra.upsert({
        where: {
          bountyId_chainId: {
            bountyId: input.bountyId,
            chainId: input.chainId,
          },
        },
        create: {
          ...input,
          amountSort: 0,
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
            dates: z.array(z.number()),
          })
          .nullish(),
      })
    )
    .query(async ({ input }) => {
      const sortByDate = input.sortType === 'date';
      const sortByValue = input.sortType === 'value';

      let items = undefined;

      if (sortByValue) {
        const bountiesExtra = await prisma.bountiesExtra.findMany({
          where: {
            bounty: {
              ban: {
                none: {},
              },
              inProgress: true,
              isCanceled: false,
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

          ...(input.cursor
            ? {
                OR: [
                  { amountSort: { lt: input.cursor.amountSort } },
                  {
                    amountSort: { equals: input.cursor.amountSort },
                    bounty: {
                      createdAt: { lt: input.cursor.createdAt },
                    },
                  },
                ],
              }
            : {}),
          },
          select: {
            bounty: {
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
            },
            amountSort: true,
          },
          orderBy: [{ amountSort: 'desc' }, { bounty: { createdAt: 'desc' } }],
          take: input.limit,
        });

        items = bountiesExtra.map((e) => ({
          ...e.bounty!,
          amountSort: e.amountSort,
        }));
      } else {
        const bounties = await prisma.bounties.findMany({
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

            extra: {
              select: {
                amountSort: true,
              },
            },
          },

          where: {
            inProgress: true,
            isCanceled: false,
            ban: {
              none: {},
            },
            ...(input.cursor
              ? {
                  createdAt: {
                    lt: input.cursor.createdAt,
                    notIn: input.cursor.dates,
                  },
                }
              : {}),

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

          orderBy: { createdAt: 'desc' },
          take: input.limit,
        });

        items = bounties.map(({ extra, ...bounty }) => ({
          ...bounty,
          amountSort: extra.amountSort,
        }));
      }

      let nextCursor:
        | {
            createdAt: number;
            amountSort: number;
            dates: number[];
          }
        | undefined = undefined;

      if (items.length === input.limit) {
        const last = items[items.length - 1];

        nextCursor = {
          createdAt: last.createdAt.toNumber(),
          amountSort: last.amountSort,
          dates: [
            ...(input.cursor?.dates ?? []),
            ...items.map((item) => Number(item?.createdAt)),
          ],
        };
      }

      return {
        items: items.map(({ claims, participations, ...bounty }) => ({
          ...bounty,
          hasClaims: claims.length > 0,
          // Claims are ordered accepted-first, so past bounty cards get their
          // claim here instead of fetching it one card at a time
          acceptedClaim: claims[0]?.isAccepted ? claims[0] : null,
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

          extra: {
            select: {
              amountSort: true,
            },
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

        orderBy: { createdAt: 'desc' },
        take: input.limit,
      });

      let nextCursor: number | undefined = undefined;
      if (items.length === input.limit) {
        nextCursor = items[items.length - 1].createdAt.toNumber();
      }

      return {
        items: items.map(({ claims, participations, extra, ...bounty }) => ({
          ...bounty,
          hasClaims: claims.length > 0,
          // Claims are ordered accepted-first, so past bounty cards get their
          // claim here instead of fetching it one card at a time
          acceptedClaim: claims[0]?.isAccepted ? claims[0] : null,
          createdAt: bounty.createdAt.toNumber(),
          hasParticipants: participations.length > 1,
          amountSort: extra.amountSort,
        })),
        nextCursor,
      };
    }),

  fetchAlbumCounts: baseProcedure
    .input(
      z.object({
        album: z.string(),
      })
    )
    .query(async ({ input }) => {
      const baseWhere = {
        extra: {
          album: { equals: input.album, mode: 'insensitive' as const },
        },
        isCanceled: false,
        ban: {
          none: {},
        },
      };

      const [open, progress, past] = await Promise.all([
        prisma.bounties.count({
          where: {
            ...baseWhere,
            inProgress: true,
            isVoting: false,
          },
        }),
        prisma.bounties.count({
          where: {
            ...baseWhere,
            inProgress: true,
            isVoting: true,
          },
        }),
        prisma.bounties.count({
          where: {
            ...baseWhere,
            inProgress: false,
          },
        }),
      ]);

      return { open, progress, past };
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

  isNewlyCreated: baseProcedure
    .input(z.object({ chainId: z.number(), id: z.number() }))
    .query(async ({ input }) => {
      const oneHourAgo = Math.floor(Date.now() / 1000) - 3600;
      return prisma.bounties.findFirst({
        where: {
          chainId: input.chainId,
          onChainId: input.id,
          inProgress: true,
          createdAt: { gte: oneHourAgo },
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
          extra: {
            select: {
              amountSort: true,
            },
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
                  { title: { contains: likeLiteral(q), mode: 'insensitive' } },
                  {
                    description: {
                      contains: likeLiteral(q),
                      mode: 'insensitive',
                    },
                  },
                ],
              }),
          ...(input.cursor ? { createdAt: { lt: input.cursor } } : {}),
        },

        // Bounty ids repeat across chains; (id, chainId) is the key.
        distinct: ['id', 'chainId'],
        orderBy: { createdAt: 'desc' },
        take: input.limit,
      });

      let nextCursor: string | undefined = undefined;
      if (items.length === input.limit) {
        nextCursor = items[items.length - 1].createdAt.toString();
      }

      return {
        items: items.map(({ claims, participations, extra, ...bounty }) => ({
          ...bounty,
          createdAt: bounty.createdAt.toNumber(),
          hasClaims: claims.length > 0,
          hasParticipants: participations.length > 1,
          amountSort: extra.amountSort,
        })),
        nextCursor,
      };
    }),
};
