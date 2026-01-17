import { z } from 'zod';
import { baseProcedure, middleware } from '../init';
import prisma from 'prisma/prisma';
import { addressSchema, bytesSchema } from '../serverTypes';
import {
  getCommentSignatureFirstLine,
  getReactionSignatureMessage,
} from '@/utils/utils';
import { TRPCError } from '@trpc/server';
import { chains } from '@/utils/config';
import { getUsersDataOrFetchItFromNeynar } from './neynar';

const COMMENTS_USER_LIMIT = {
  global: 20,
  bounty: 3,
  timeLimit: 5 * 60 * 1000,
};

const verifyComment = middleware(async (opts) => {
  const schema = z.object({
    address: addressSchema,
    bountyId: z.number(),
    chainId: z.union([z.literal(8453), z.literal(666666666), z.literal(42161)]),
    signature: bytesSchema,
    signatureText: z.string(),
  });

  const { input, next } = opts;

  const parsedInput = schema.safeParse(input);

  if (parsedInput.error) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid input! Check zod schema. \n',
    });
  }

  const { address, signature, signatureText: message } = parsedInput.data;

  const { bountyCount, globalCount } = await getUserCommentsCount({
    ...parsedInput.data,
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

  const chain = chains['base'];

  const expectedMessage = getCommentSignatureFirstLine({
    address,
  });

  if (!message.startsWith(expectedMessage)) {
    throw new TRPCError({
      code: 'UNPROCESSABLE_CONTENT',
      message: 'Invalid message',
    });
  }

  const isValid = await chain.provider.verifyMessage({
    address,
    signature,
    message,
  });

  if (!isValid) {
    throw new TRPCError({
      code: 'UNPROCESSABLE_CONTENT',
      message: 'Signature is invalid',
    });
  }

  return next();
});

const verifyReaction = middleware(async (opts) => {
  const schema = z.object({
    address: addressSchema,
    chainId: z.union([z.literal(8453), z.literal(666666666), z.literal(42161)]),
    commentId: z.number(),
    signature: bytesSchema,
    signatureText: z.string(),
    type: z.union([z.literal('upvote'), z.literal('downvote')]),
  });

  const { input, next } = opts;

  const parsedInput = schema.safeParse(input);

  if (parsedInput.error) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Invalid input! Check zod schema. \n',
    });
  }

  const {
    address,
    signature,
    signatureText: message,
    commentId,
    type,
  } = parsedInput.data;

  const chain = chains['base'];
  const expectedMessage = getReactionSignatureMessage({
    address,
    commentId,
    type,
  });

  if (message !== expectedMessage) {
    throw new TRPCError({
      code: 'UNPROCESSABLE_CONTENT',
      message: 'Invalid message',
    });
  }

  const isValid = await chain.provider.verifyMessage({
    address,
    signature,
    message,
  });

  if (!isValid) {
    throw new TRPCError({
      code: 'UNPROCESSABLE_CONTENT',
      message: 'Signature is invalid',
    });
  }

  return next({
    ctx: opts.ctx,
    input: parsedInput.data,
  });
});

export const commentsRouter = {
  fetch: baseProcedure
    .input(
      z.object({
        bountyId: z.number(),
        chainId: z.union([
          z.literal(8453),
          z.literal(666666666),
          z.literal(42161),
        ]),
      })
    )
    .query(async ({ input }) => {
      const { chainId: chain_id, bountyId: bounty_id } = input;

      const comments = await prisma.comments.findMany({
        where: {
          AND: [{ bounty_id }, { chain_id }, { deleted_at: null }],
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
          created_at: 'asc',
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

  comment: baseProcedure
    .input(
      z.object({
        address: addressSchema.transform((address) =>
          address.toLocaleLowerCase()
        ),
        bountyId: z.number(),
        chainId: z.union([
          z.literal(8453),
          z.literal(666666666),
          z.literal(42161),
        ]),
        signature: bytesSchema,
        text: z.string(),
        signatureText: z.string(),
        parrentId: z.number().optional(),
      })
    )
    .use(verifyComment)
    .mutation(async ({ input }) => {
      await getUsersDataOrFetchItFromNeynar([input.address]);
      await prisma.comments.create({
        data: {
          body: input.text,
          parent_id: input.parrentId,
          chain_id: input.chainId,
          bounty_id: input.bountyId,
          user_address: input.address,
        },
      });
    }),

  rate: baseProcedure
    .input(
      z.object({
        address: addressSchema.transform((address) =>
          address.toLocaleLowerCase()
        ),
        chainId: z.union([
          z.literal(8453),
          z.literal(666666666),
          z.literal(42161),
        ]),
        commentId: z.number(),
        signature: bytesSchema,
        signatureText: z.string(),
        type: z.union([z.literal('upvote'), z.literal('downvote')]),
      })
    )
    .use(verifyReaction)
    .mutation(async ({ input }) => {
      const comment = await prisma.comments.findFirst({
        where: {
          AND: [{ id: input.commentId }, { chain_id: input.chainId }],
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

      await getUsersDataOrFetchItFromNeynar([input.address]);
      await prisma.$transaction([
        prisma.reactions.deleteMany({
          where: {
            comment_id: input.commentId,
            address: input.address,
          },
        }),
        prisma.reactions.create({
          data: {
            comment_id: input.commentId,
            address: input.address,
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
      user_address: address,
      created_at: {
        gte: fiveMinutesAgo,
      },
    },
  });

  return {
    globalCount: comments.length,
    bountyCount: comments.filter(
      (comment) =>
        comment.bounty_id === bountyId && comment.chain_id === chainId
    ).length,
  };
}
