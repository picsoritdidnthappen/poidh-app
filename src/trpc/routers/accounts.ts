import prisma from 'prisma/prisma';
import { baseProcedure } from '../init';
import { z } from 'zod';
import { ChainId } from '@/utils/types';
import { addressSchema } from '../serverTypes';
import { formatEther } from 'viem';
import { fetchPrice } from '@/utils/utils';
import { fetchImageMetadata } from './claims';
import {
  ARBITRUM_LAST_PRE_V3_BOUNTY,
  BASE_LAST_PRE_V3_BOUNTY,
  DEGEN_LAST_PRE_V3_BOUNTY,
} from '@/utils/constants';

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
        cursor: z.number().nullish(),
      })
    )
    .query(async ({ input }) => {
      const items = await prisma.claims.findMany({
        where: {
          owner: input.address.toLowerCase(),
          ...(input.cursor
            ? {
                id: {
                  lt: input.cursor,
                },
              }
            : {}),
        },
        orderBy: {
          id: 'desc',
        },
        take: input.limit,
      });

      let nextCursor:
        | number
        | undefined = undefined;

      if (
        items.length ===
        input.limit
      ) {
        nextCursor =
          items[
            items.length - 1
          ].id;
      }

      const normalizedItems =
        await Promise.all(
          items.map(
            async (claim) => {
              const imageMetadata =
                await fetchImageMetadata(
                  claim.url
                );

              return {
                ...claim,
                url:
                  imageMetadata.image,
              };
            }
          )
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
        cursor: z.number().nullish(),
      })
    )
    .query(async ({ input }) => {
      const items = await prisma.claims.findMany({
        where: {
          issuer:
            input.address.toLowerCase(),

          ban: {
            none: {},
          },

          ...(input.cursor
            ? {
                id: {
                  lt: input.cursor,
                },
              }
            : {}),
        },

        orderBy: {
          id: 'desc',
        },

        take: input.limit,
      });

      let nextCursor:
        | number
        | undefined = undefined;

      if (
        items.length ===
        input.limit
      ) {
        nextCursor =
          items[
            items.length - 1
          ].id;
      }

      const normalizedItems =
        await Promise.all(
          items.map(
            async (claim) => {
              const imageMetadata =
                await fetchImageMetadata(
                  claim.url
                );

              return {
                ...claim,
                url:
                  imageMetadata.image,
              };
            }
          )
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
      const addr =
        input.address.toLowerCase();

      const [
        nfts,
        claims,
        createdBounties,
        contributedBounties,
        completedClaims,
      ] = await Promise.all([
        prisma.claims.count({
          where: {
            owner: addr,
          },
        }),

        prisma.claims.count({
          where: {
            issuer: addr,
            ban: {
              none: {},
            },
          },
        }),

        prisma.bounties.findMany({
          where: {
            issuer: addr,

            ban: {
              none: {},
            },
          },

          select: {
            id: true,
            chainId: true,
            inProgress: true,
            isCanceled: true,
          },
        }),

        prisma.participationsBounties.findMany({
          where: {
            userAddress: addr,

            bounty: {
              ban: {
                none: {},
              },
            },
          },

          select: {
            bountyId: true,
            chainId: true,

            bounty: {
              select: {
                id: true,
                chainId: true,
                inProgress: true,
                isCanceled: true,
              },
            },
          },
        }),

        prisma.claims.count({
          where: {
            issuer: addr,
            isAccepted: true,

            ban: {
              none: {},
            },
          },
        }),
      ]);

      const uniqueBountyIds =
        new Set<string>();

      createdBounties.forEach(
        (bounty) => {
          uniqueBountyIds.add(
            `${bounty.id}-${bounty.chainId}`
          );
        }
      );

      contributedBounties.forEach(
        (participation) => {
          uniqueBountyIds.add(
            `${participation.bountyId}-${participation.chainId}`
          );
        }
      );

      const bounties =
        uniqueBountyIds.size;

      const activeIds =
        new Set<string>();

      const completedIds =
        new Set<string>();

      createdBounties.forEach(
        (bounty) => {
          if (
            !bounty.isCanceled
          ) {
            if (
              bounty.inProgress
            ) {
              activeIds.add(
                `${bounty.id}-${bounty.chainId}`
              );
            } else {
              completedIds.add(
                `${bounty.id}-${bounty.chainId}`
              );
            }
          }
        }
      );

      contributedBounties.forEach(
        (participation) => {
          const bounty =
            participation.bounty;

          if (
            bounty &&
            !bounty.isCanceled
          ) {
            if (
              bounty.inProgress
            ) {
              activeIds.add(
                `${bounty.id}-${bounty.chainId}`
              );
            } else {
              completedIds.add(
                `${bounty.id}-${bounty.chainId}`
              );
            }
          }
        }
      );

      return {
        nfts,
        claims,
        bounties,
        activeBounties:
          activeIds.size,
        completedBounties:
          completedIds.size,
        completedClaims,
      };
    }),

  bounties: baseProcedure
    .input(
      z.object({
        address: addressSchema,

        limit: z
          .number()
          .min(1)
          .max(100)
          .default(9),

        cursor: z
          .object({
            createdAt:
              z.coerce.number(),

            inProgress:
              z.boolean(),

            isCanceled:
              z.boolean(),
          })
          .nullish(),
      })
    )
    .query(async ({ input }) => {
      const [
        createdBounties,
        contributed,
      ] = await Promise.all([
        prisma.bounties
          .findMany({
            where: {
              issuer:
                input.address.toLowerCase(),

              ban: {
                none: {},
              },
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
                select: {
                  userAddress: true,
                },
                take: 2,
              },

              extra: {
                select: {
                  amountSort: true,
                },
              },
            },

            orderBy: [
              {
                isCanceled:
                  'asc',
              },
              {
                inProgress:
                  'desc',
              },
              {
                createdAt:
                  'desc',
              },
            ],
          })
          .then((rows) =>
            rows.map(
              ({
                claims,
                participations,
                extra,
                ...bounty
              }) => ({
                ...bounty,

                hasClaims:
                  claims.length > 0,

                createdAt:
                  bounty.createdAt.toNumber(),

                hasParticipants:
                  participations.length >
                  1,

                amountSort:
                  extra.amountSort,
              })
            )
          ),

        prisma.participationsBounties
          .findMany({
            where: {
              userAddress:
                input.address.toLowerCase(),

              bounty: {
                ban: {
                  none: {},
                },
              },
            },

            orderBy: [
              {
                bounty: {
                  isCanceled:
                    'asc',
                },
              },
              {
                bounty: {
                  inProgress:
                    'desc',
                },
              },
              {
                bounty: {
                  createdAt:
                    'desc',
                },
              },
            ],

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
                    select: {
                      userAddress:
                        true,
                    },
                    take: 2,
                  },

                  extra: {
                    select: {
                      amountSort:
                        true,
                    },
                  },
                },
              },
            },
          })
          .then((rows) =>
            rows
              .map(
                (participation) =>
                  participation.bounty
              )
              .filter(
                (
                  bounty
                ): bounty is NonNullable<
                  typeof bounty
                > =>
                  !!bounty
              )
              .map(
                ({
                  claims,
                  participations,
                  extra,
                  ...bounty
                }) => ({
                  ...bounty,

                  hasClaims:
                    claims.length >
                    0,

                  createdAt:
                    bounty.createdAt.toNumber(),

                  hasParticipants:
                    participations.length >
                    1,

                  amountSort:
                    extra.amountSort,
                })
              )
          ),
      ]);

      const mergedMap =
        new Map<
          string,
          (typeof createdBounties)[number]
        >();

      [
        ...createdBounties,
        ...contributed,
      ].forEach((bounty) => {
        if (bounty) {
          mergedMap.set(
            `${bounty.id}-${bounty.chainId}`,
            bounty
          );
        }
      });

      const compare = (
        a: (typeof createdBounties)[number],
        b: (typeof createdBounties)[number]
      ) => {
        const aCanceled =
          a.isCanceled ? 1 : 0;

        const bCanceled =
          b.isCanceled ? 1 : 0;

        if (
          aCanceled !== bCanceled
        ) {
          return (
            aCanceled -
            bCanceled
          );
        }

        const aInProgress =
          a.inProgress ? 1 : 0;

        const bInProgress =
          b.inProgress ? 1 : 0;

        if (
          aInProgress !==
          bInProgress
        ) {
          return (
            bInProgress -
            aInProgress
          );
        }

        return (
          b.createdAt -
          a.createdAt
        );
      };

      let merged =
        Array.from(
          mergedMap.values()
        ).sort(compare);

      if (input.cursor) {
        const cursor =
          input.cursor;

        merged =
          merged.filter(
            (item) => {
              const itemCanceled =
                item.isCanceled
                  ? 1
                  : 0;

              const cursorCanceled =
                cursor.isCanceled
                  ? 1
                  : 0;

              if (
                itemCanceled !==
                cursorCanceled
              ) {
                return (
                  itemCanceled >
                  cursorCanceled
                );
              }

              const itemProgress =
                item.inProgress
                  ? 1
                  : 0;

              const cursorProgress =
                cursor.inProgress
                  ? 1
                  : 0;

              if (
                itemProgress !==
                cursorProgress
              ) {
                return (
                  itemProgress <
                  cursorProgress
                );
              }

              return (
                item.createdAt <
                cursor.createdAt
              );
            }
          );
      }

      const page =
        merged.slice(
          0,
          input.limit
        );

      let nextCursor:
        | {
            createdAt: number;
            inProgress: boolean;
            isCanceled: boolean;
          }
        | undefined =
        undefined;

      if (
        merged.length >
        input.limit
      ) {
        const last =
          page[
            page.length - 1
          ];

        nextCursor = {
          createdAt:
            last.createdAt,

          inProgress:
            !!last.inProgress,

          isCanceled:
            !!last.isCanceled,
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
      const ethChainIds: ChainId[] =
        [
          8453,
          42161,
          1,
        ] as ChainId[];

      const degenChainId:
        ChainId =
        666666666 as ChainId;

      const [
        ethParticipationsInProgress,
        degenParticipationsInProgress,
      ] = await Promise.all([
        prisma.participationsBounties.findMany({
          where: {
            userAddress:
              input.address.toLowerCase(),

            chainId: {
              in: ethChainIds as number[],
            },

            bounty: {
              is: {
                inProgress: true,
                isCanceled: false,

                ban: {
                  none: {},
                },
              },
            },
          },

          select: {
            amount: true,
          },
        }),

        prisma.participationsBounties.findMany({
          where: {
            userAddress:
              input.address.toLowerCase(),

            chainId:
              degenChainId as number,

            bounty: {
              is: {
                inProgress: true,
                isCanceled: false,

                ban: {
                  none: {},
                },
              },
            },
          },

          select: {
            amount: true,
          },
        }),
      ]);

      const [
        ethStats,
        degenStats,
        usersExtra,
      ] = await Promise.all([
        prisma.leaderboard.findMany({
          where: {
            address:
              input.address.toLowerCase(),

            chainId: {
              in: ethChainIds as number[],
            },
          },
        }),

        prisma.leaderboard.findUnique({
          where: {
            address_chainId: {
              address:
                input.address.toLowerCase(),

              chainId:
                degenChainId as number,
            },
          },
        }),

        prisma.usersExtra.findFirst({
          where: {
            address: {
              equals:
                input.address.toLowerCase(),

              mode:
                'insensitive',
            },
          },

          select: {
            extraPoints: true,
          },
        }),
      ]);

      const ethInContractWei =
        ethParticipationsInProgress
          .flatMap(
            (participation) =>
              BigInt(
                participation.amount
              )
          )
          .reduce(
            (acc, value) =>
              acc + value,
            BigInt(0)
          );

      const degenInContractWei =
        degenParticipationsInProgress
          .flatMap(
            (participation) =>
              BigInt(
                participation.amount
              )
          )
          .reduce(
            (acc, value) =>
              acc + value,
            BigInt(0)
          );

      const ethAmountInContract =
        formatEther(
          ethInContractWei
        );

      const degenAmountInContract =
        formatEther(
          degenInContractWei
        );

      const totalEthPaid = (
        ethStats ?? []
      ).reduce(
        (acc, stat) =>
          acc +
          Number(
            stat.paid ?? 0
          ),
        0
      );

      const totalEthEarn = (
        ethStats ?? []
      ).reduce(
        (acc, stat) =>
          acc +
          Number(
            stat.earned ?? 0
          ),
        0
      );

      const totalDegenPaid =
        Number(
          degenStats?.paid ??
            0
        );

      const totalDegenEarn =
        Number(
          degenStats?.earned ??
            0
        );

      const totalEthNfts = (
        ethStats ?? []
      ).reduce(
        (acc, stat) =>
          acc +
          Number(
            stat.nfts ?? 0
          ),
        0
      );

      const [
        ethPrice,
        degenPrice,
      ] = await Promise.all([
        fetchPrice({
          currency: 'eth',
        }),

        fetchPrice({
          currency:
            'degen',
        }),
      ]);

      const poidhScore =
        Math.round(
          scoreDegen({
            earned:
              totalDegenEarn ??
              0,

            paid:
              totalDegenPaid ??
              0,

            NFTheld:
              Number(
                degenStats?.nfts ??
                  0
              ),
          }) +
            scoreETH({
              earned:
                totalEthEarn ??
                0,

              paid:
                totalEthPaid ??
                0,

              NFTheld:
                totalEthNfts,
            }) +
            Number(
              usersExtra?.extraPoints ??
                0
            )
        );

      return {
        poidhScore:
          poidhScore.toFixed(
            0
          ),

        eth: {
          amountInContract:
            convertAmount({
              price: ethPrice,

              amount:
                ethAmountInContract,
            }),

          totalPaid:
            convertAmount({
              price: ethPrice,

              amount:
                totalEthPaid.toString(),
            }),

          totalEarn:
            convertAmount({
              price: ethPrice,

              amount:
                totalEthEarn.toString(),
            }),
        },

        degen: {
          amountInContract:
            convertAmount({
              price:
                degenPrice,

              amount:
                degenAmountInContract,
            }),

          totalPaid:
            convertAmount({
              price:
                degenPrice,

              amount:
                totalDegenPaid.toString(),
            }),

          totalEarn:
            convertAmount({
              price:
                degenPrice,

              amount:
                totalDegenEarn.toString(),
            }),
        },
      };
    }),

  activities: baseProcedure
    .input(
      z.object({
        address:
          z.string().optional(),

        limit: z
          .number()
          .min(1)
          .max(200)
          .default(10),

        cursor:
          z.string().nullish(),
      })
    )
    .query(async ({ input }) => {
      const normalizedAddress =
        input.address?.toLowerCase();

      const cursorTimestamp =
        input.cursor
          ? Number(
              input.cursor
            )
          : null;

      const commentCursorDate =
        cursorTimestamp !==
          null &&
        Number.isFinite(
          cursorTimestamp
        )
          ? new Date(
              cursorTimestamp *
                1000
            )
          : undefined;

      /*
       * Pull transactions and comments independently,
       * then merge them into one chronological feed.
       */
      const [
        txs,
        comments,
      ] = await Promise.all([
        prisma.transactions.findMany({
          include: {
            bounty: {
              select: {
                id: true,
                chainId: true,
                title: true,
                issuer: true,
                amount: true,
              },
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
            action: {
              not:
                'bounty canceled',
            },

            bounty: {
              ban: {
                none: {},
              },
            },

            OR: [
              {
                claimId: {
                  equals: null,
                },
              },
              {
                claim: {
                  is: {
                    ban: {
                      none: {},
                    },
                  },
                },
              },
            ],

            ...(normalizedAddress
              ? {
                  address:
                    normalizedAddress,
                }
              : {}),

            ...(input.cursor
              ? {
                  timestamp: {
                    lt:
                      input.cursor,
                  },
                }
              : {}),
          },

          orderBy: {
            timestamp:
              'desc',
          },

          take:
            input.limit,
        }),

        prisma.comments.findMany({
          where: {
            deletedAt: null,

            ...(normalizedAddress
              ? {
                  userAddress:
                    normalizedAddress,
                }
              : {}),

            ...(commentCursorDate
              ? {
                  createdAt: {
                    lt:
                      commentCursorDate,
                  },
                }
              : {}),
          },

          select: {
            id: true,
            body: true,
            parentId: true,
            bountyId: true,
            chainId: true,
            userAddress: true,
            createdAt: true,
          },

          orderBy: {
            createdAt:
              'desc',
          },

          take:
            input.limit,
        }),
      ]);

      /*
       * Resolve the direct parent comments for replies.
       *
       * Feed activity can then show the actual conversation:
       * parent author + parent comment -> reply author + reply.
       */
      const parentIds =
        Array.from(
          new Set(
            comments
              .map(
                (comment) =>
                  comment.parentId
              )
              .filter(
                (
                  id
                ): id is number =>
                  id !== null
              )
          )
        );

      const parentComments =
        parentIds.length > 0
          ? await prisma.comments.findMany(
              {
                where: {
                  id: {
                    in: parentIds,
                  },
                  deletedAt: null,
                },

                select: {
                  id: true,
                  body: true,
                  userAddress:
                    true,
                },
              }
            )
          : [];

      const parentCommentMap =
        new Map(
          parentComments.map(
            (comment) => [
              comment.id,
              {
                id: comment.id,
                body: comment.body,
                address:
                  comment.userAddress,
              },
            ]
          )
        );

      /*
       * Resolve bounty metadata for comments.
       * Missing/banned bounties are omitted from the feed.
       */
      const uniqueBountyKeys =
        Array.from(
          new Map(
            comments.map(
              (comment) => [
                `${comment.chainId}-${comment.bountyId}`,
                {
                  id:
                    comment.bountyId,

                  chainId:
                    comment.chainId,
                },
              ]
            )
          ).values()
        );

      const commentBounties =
        uniqueBountyKeys.length >
        0
          ? await prisma.bounties.findMany(
              {
                where: {
                  OR:
                    uniqueBountyKeys,

                  ban: {
                    none: {},
                  },
                },

                select: {
                  id: true,
                  chainId: true,
                  title: true,
                  issuer: true,
                  amount: true,
                },
              }
            )
          : [];

      const bountyMap =
        new Map(
          commentBounties.map(
            (bounty) => [
              `${bounty.chainId}-${bounty.id}`,
              bounty,
            ]
          )
        );

      /*
       * Preserve claim-media normalization for transaction
       * activity.
       */
      const normalizedTxs =
        await Promise.all(
          txs.map(
            async (tx) => {
              if (
                !tx.claim?.url
              ) {
                return {
                  ...tx,

                  timestamp:
                    tx.timestamp.toString(),

                  comment: null,
                };
              }

              const imageMetadata =
                await fetchImageMetadata(
                  tx.claim.url
                );

              return {
                ...tx,

                timestamp:
                  tx.timestamp.toString(),

                claim: {
                  ...tx.claim,

                  /*
                   * Preserve original claim URI.
                   */
                  url:
                    tx.claim.url,

                  /*
                   * Also expose server-resolved media.
                   */
                  mediaUrl:
                    imageMetadata.image,
                },

                comment: null,
              };
            }
          )
        );

      const commentActivities =
        comments
          .map(
            (comment) => {
              const bounty =
                bountyMap.get(
                  `${comment.chainId}-${comment.bountyId}`
                );

              if (!bounty) {
                return null;
              }

              const parent =
                comment.parentId !== null
                  ? parentCommentMap.get(
                      comment.parentId
                    ) ?? null
                  : null;

              const timestamp =
                Math.floor(
                  comment.createdAt.getTime() /
                    1000
                ).toString();

              return {
                /*
                 * Synthetic stable ID for offchain activity.
                 */
                tx: `comment-${comment.chainId}-${comment.id}`,

                index:
                  comment.id,

                bounty,

                claim: null,

                bountyId:
                  comment.bountyId,

                claimId: null,

                chainId:
                  comment.chainId,

                address:
                  comment.userAddress,

                action:
                  comment.parentId !==
                  null
                    ? 'reply created'
                    : 'comment created',

                timestamp,

                comment: {
                  id:
                    comment.id,

                  body:
                    comment.body,

                  parentId:
                    comment.parentId,

                  replyToAddress:
                    parent?.address ??
                    null,

                  parent,
                },
              };
            }
          )
          .filter(
            (
              item
            ): item is NonNullable<
              typeof item
            > =>
              item !== null
          );

      /*
       * Merge both sources into one chronological feed.
       */
      const merged = [
        ...normalizedTxs,
        ...commentActivities,
      ].sort(
        (a, b) =>
          Number(
            b.timestamp
          ) -
          Number(
            a.timestamp
          )
      );

      const items =
        merged.slice(
          0,
          input.limit
        );

      /*
       * Keep infinite scroll alive if either source may
       * contain more rows.
       */
      const hasMore =
        merged.length >
          input.limit ||
        txs.length ===
          input.limit ||
        comments.length ===
          input.limit;

      const nextCursor =
        hasMore &&
        items.length > 0
          ? items[
              items.length - 1
            ].timestamp.toString()
          : undefined;

      return {
        items,
        nextCursor,
      };
    }),

  canVote: baseProcedure
    .input(
      z.object({
        address:
          addressSchema,

        bountyId:
          z.number(),

        chainId:
          z.number(),

        currentRound:
          z.number(),
      })
    )
    .query(async ({ input }) => {
      const votingStartedTxs =
        await prisma.transactions.findMany(
          {
            where: {
              bountyId:
                input.bountyId,

              chainId:
                input.chainId,

              action: {
                contains:
                  'submitted for vote',
              },
            },

            orderBy: {
              timestamp:
                'asc',
            },

            take:
              input.currentRound,
          }
        );

      const roundStartTx =
        votingStartedTxs[
          input.currentRound -
            1
        ];

      if (!roundStartTx) {
        return true;
      }

      const tx =
        await prisma.transactions.findFirst(
          {
            where: {
              address:
                input.address.toLowerCase(),

              action:
                'voted',

              bountyId:
                input.bountyId,

              chainId:
                input.chainId,

              timestamp: {
                gt:
                  roundStartTx.timestamp,
              },
            },
          }
        );

      return !tx;
    }),

  hasClaimedRefund:
    baseProcedure
      .input(
        z.object({
          address:
            addressSchema,

          bountyId:
            z.number(),

          chainId:
            z.number(),
        })
      )
      .query(
        async ({
          input,
        }) => {
          const tx =
            await prisma.transactions.findFirst(
              {
                where: {
                  address: {
                    equals:
                      input.address,

                    mode:
                      'insensitive',
                  },

                  action:
                    'funds claimed',

                  bountyId:
                    input.bountyId,

                  chainId:
                    input.chainId,
                },
              }
            );

          return !!tx;
        }
      ),

  pendingRefunds:
    baseProcedure
      .input(
        z.object({
          address:
            addressSchema,
        })
      )
      .query(
        async ({
          input,
        }) => {
          const participations =
            await prisma.participationsBounties.findMany(
              {
                where: {
                  userAddress:
                    input.address.toLowerCase(),

                  bounty: {
                    isCanceled:
                      true,

                    isMultiplayer:
                      true,

                    NOT: {
                      issuer:
                        input.address.toLowerCase(),
                    },

                    OR: [
                      {
                        chainId:
                          1,
                      },
                      {
                        chainId:
                          42161,

                        id: {
                          gt:
                            ARBITRUM_LAST_PRE_V3_BOUNTY,
                        },
                      },
                      {
                        chainId:
                          8453,

                        id: {
                          gt:
                            BASE_LAST_PRE_V3_BOUNTY,
                        },
                      },
                      {
                        chainId:
                          666666666,

                        id: {
                          gt:
                            DEGEN_LAST_PRE_V3_BOUNTY,
                        },
                      },
                    ],
                  },
                },

                include: {
                  bounty: {
                    select: {
                      id: true,
                      onChainId:
                        true,
                      chainId:
                        true,
                      title: true,
                      description:
                        true,
                    },
                  },
                },
              }
            );

          const claimedTxs =
            await prisma.transactions.findMany(
              {
                where: {
                  address: {
                    equals:
                      input.address,

                    mode:
                      'insensitive',
                  },

                  action:
                    'funds claimed',

                  bountyId: {
                    in:
                      participations.map(
                        (
                          participation
                        ) =>
                          participation.bountyId
                      ),
                  },

                  chainId: {
                    in:
                      participations.map(
                        (
                          participation
                        ) =>
                          participation.chainId
                      ),
                  },
                },

                select: {
                  bountyId:
                    true,
                  chainId:
                    true,
                },
              }
            );

          const claimedSet =
            new Set(
              claimedTxs.map(
                (tx) =>
                  `${tx.bountyId}-${tx.chainId}`
              )
            );

          return participations
            .filter(
              (
                participation
              ) =>
                !claimedSet.has(
                  `${participation.bountyId}-${participation.chainId}`
                )
            )
            .map(
              (
                participation
              ) => ({
                bountyId:
                  participation.bountyId,

                onChainId:
                  participation
                    .bounty
                    .onChainId,

                chainId:
                  participation
                    .bounty
                    .chainId,

                title:
                  participation
                    .bounty
                    .title,

                description:
                  participation
                    .bounty
                    .description,
              })
            );
        }
      ),
};
