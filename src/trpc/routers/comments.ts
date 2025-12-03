import { z } from 'zod';
import { baseProcedure } from '../init';
import prisma from 'prisma/prisma';
import { addressSchema, bytesSchema, chainNameSchema } from '../serverTypes';
import { getCommentSignatureFirstLine } from '@/utils/utils';
import { TRPCError } from '@trpc/server';
import { chains } from '@/utils/config';

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
          AND: [{ bounty_id }, { chain_id }],
        },
        orderBy: {
          created_at: 'asc',
        },
      });

      return comments;
    }),

  comment: baseProcedure
    .input(
      z.object({
        address: addressSchema,
        bountyId: z.number(),
        chainId: z.union([
          z.literal(8453),
          z.literal(666666666),
          z.literal(42161),
        ]),
        signature: bytesSchema,
        text: z.string(),
        parrentId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const expectedMessage = getCommentSignatureFirstLine({
        address: input.address,
      });

      if (!input.text.startsWith(expectedMessage)) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Invalid message',
        });
      }

      const chain = chains['base'];

      const isValid = await chain.provider.verifyMessage({
        address: input.address,
        message: input.text,
        signature: input.signature,
      });

      if (!isValid) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Signature is invalid',
        });
      }

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
};
