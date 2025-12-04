import { z } from 'zod';
import { baseProcedure } from '../init';
import { addressSchema, bytesSchema, chainNameSchema } from '../serverTypes';
import serverEnv from '@/utils/serverEnv';
import prisma from 'prisma/prisma';
import { TRPCError } from '@trpc/server';
import { getBanSignatureFirstLine } from '@/utils/utils';
import { chains } from '@/utils/config';

export const adminRouter = {
  isAdmin: baseProcedure
    .input(
      z.object({
        address: addressSchema.optional(),
      })
    )
    .query(({ input }) => {
      return checkIsAdmin(input.address);
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

  banComment: baseProcedure
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
        type: 'comment',
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

      const comment = await prisma.comments.findFirst({
        where: { id: input.id, chain_id: input.chainId },
      });

      if (!comment) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Comment not found',
        });
      }

      await prisma.comments.updateMany({
        where: { OR: [{ id: input.id }, { parent_id: input.id }] },
        data: { deleted_at: new Date() },
      });
    }),
};

function checkIsAdmin(address?: string) {
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
