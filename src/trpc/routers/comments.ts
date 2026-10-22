import { z } from 'zod';
import { authedProcedure, baseProcedure } from '../init';
import prisma from 'prisma/prisma';
import { TRPCError } from '@trpc/server';
import { getChainById } from '@/utils/config';
import { getUsersDataOrFetchItFromNeynar } from './neynar';

const COMMENTS_USER_LIMIT = {
  global: 20,
  bounty: 3,
  timeLimit: 5 * 60 * 1000,
};

export const commentsRouter = {
  fetch: baseProcedure
    .input(
      z.object({
        bountyId: z.number(),
        chainId: z.union([
          z.literal(8453),
          z.literal(666666666),
          z.literal(42161),
          z.literal(1),
        ]),
      })
    )
    .query(async ({ input }) => {
      const { chainId, bountyId } = input;

      const comments = await prisma.comments.findMany({
        where: {
          AND: [{ bountyId }, { chainId }, { deletedAt: null }],
        },
        include: {
          author: {
            select: {
              usersExtras: {
                take: 1,
              },
            },
          },
          reactions: {
            select: {
              type: true,
            },
          },
        },
        orderBy: {
          // Older comments usually have more likes,
          // so this is a small optimization
          createdAt: 'asc',
        },
      });

      return comments.map(({ reactions, ...comment }) => {
        const { upvotes, downvotes } = reactions.reduce(
          (acc, reaction) => {
            if (reaction.type === 'upvote') {
              acc.upvotes += 1;
            } else if (reaction.type === 'downvote') {
              acc.downvotes += 1;
            }
            return acc;
          },
          { upvotes: 0, downvotes: 0 }
        );

        return {
          ...comment,
          upvotes,
          downvotes,
          author: comment.author?.usersExtras?.[0],
        };
      });
    }),

  /**
   * Posts a comment or reply as the signed-in user, then notifies the bounty
   * issuer and, for a reply, the parent comment's author. Each user can post
   * a limited number of comments every few minutes.
   */
  comment: authedProcedure
    .input(
      z.object({
        bountyId: z.number(),
        chainId: z.union([
          z.literal(8453),
          z.literal(666666666),
          z.literal(42161),
          z.literal(1),
        ]),
        text: z.string(),
        parrentId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { address } = ctx.session;

      const { bountyCount, globalCount } = await getUserCommentsCount({
        address,
        bountyId: input.bountyId,
        chainId: input.chainId,
      });

      if (
        bountyCount >= COMMENTS_USER_LIMIT.bounty ||
        globalCount >= COMMENTS_USER_LIMIT.global
      ) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message:
            'You reached your comments limit. Ask admin to reset it or wait 5 min.',
        });
      }

      await getUsersDataOrFetchItFromNeynar([address]);
      const [bounty, parentComment] = await Promise.all([
        prisma.bounties.findFirst({
          where: {
            id: input.bountyId,
            chainId: input.chainId,
          },
          select: {
            issuer: true,
          },
        }),
        input.parrentId
          ? prisma.comments.findFirst({
              where: {
                id: input.parrentId,
              },
              select: {
                userAddress: true,
              },
            })
          : Promise.resolve(null),
      ]);
      await prisma.comments.create({
        data: {
          body: input.text,
          parentId: input.parrentId,
          chainId: input.chainId,
          bountyId: input.bountyId,
          userAddress: address,
        },
      });

      const chain = getChainById({ chainId: input.chainId });
      const shortMessage =
        input.text.length > 140 ? `${input.text.slice(0, 137)}...` : input.text;
      const addresses = new Set<string>();

      if (bounty?.issuer && bounty.issuer !== address) {
        addresses.add(bounty.issuer);
      }

      if (
        input.parrentId &&
        parentComment?.userAddress &&
        parentComment.userAddress !== address
      ) {
        addresses.add(parentComment.userAddress);
      }

      await prisma.notifications.create({
        data: {
          event: input.parrentId ? 'ReplyCreated' : 'CommentCreated',
          data: {
            addresses: Array.from(addresses),
            link: `https://poidh.xyz/${chain.slug}/bounty/${input.bountyId}`,
            message: shortMessage,
            issuer: address,
          },
        },
      });
    }),

  /**
   * Upvotes or downvotes a comment as the signed-in user, replacing any vote
   * they already gave it.
   */
  rate: authedProcedure
    .input(
      z.object({
        chainId: z.union([
          z.literal(8453),
          z.literal(666666666),
          z.literal(42161),
          z.literal(1),
        ]),
        commentId: z.number(),
        type: z.union([z.literal('upvote'), z.literal('downvote')]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { address } = ctx.session;

      const comment = await prisma.comments.findFirst({
        where: {
          AND: [{ id: input.commentId }, { chainId: input.chainId }],
        },
        select: {
          id: true,
        },
      });

      if (!comment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Comment not found',
        });
      }

      await getUsersDataOrFetchItFromNeynar([address]);
      await prisma.$transaction([
        prisma.reactions.deleteMany({
          where: {
            commentId: input.commentId,
            address,
          },
        }),
        prisma.reactions.create({
          data: {
            commentId: input.commentId,
            address,
            type: input.type,
          },
        }),
      ]);
    }),
};

async function getUserCommentsCount({
  address,
  bountyId,
  chainId,
}: {
  address: string;
  bountyId: number;
  chainId: number;
}) {
  const fiveMinutesAgo = new Date(Date.now() - COMMENTS_USER_LIMIT.timeLimit);

  const comments = await prisma.comments.findMany({
    where: {
      userAddress: address,
      createdAt: {
        gte: fiveMinutesAgo,
      },
    },
  });

  return {
    globalCount: comments.length,
    bountyCount: comments.filter(
      (comment) => comment.bountyId === bountyId && comment.chainId === chainId
    ).length,
  };
}
