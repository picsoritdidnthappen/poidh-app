import { z } from 'zod';
import { baseProcedure } from '../init';
import { addressSchema, bytesSchema, chainNameSchema } from '../serverTypes';
import serverEnv from '@/utils/serverEnv';
import prisma from 'prisma/prisma';
import { TRPCError } from '@trpc/server';
import { getBanMessage } from '@/utils/utils';
import { chains } from '@/utils/config';
import { claimNonce } from '../nonce';

const banInput = z.object({
  id: z.number(),
  chainId: z.number(),
  address: addressSchema,
  signature: bytesSchema,
  chainName: chainNameSchema,
  nonce: z.string(),
});

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

  /**
   * Bans a bounty. Admins only, with a fresh signature for every ban.
   */
  banBounty: baseProcedure.input(banInput).mutation(async ({ input }) => {
    if (!checkIsAdmin(input.address)) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Not authorized to perform this action',
      });
    }

    await verifyBanSignature({ ...input, type: 'bounty' });

    await prisma.ban.create({
      data: {
        chainId: input.chainId,
        bountyId: input.id,
        bannedBy: input.address.toLowerCase(),
      },
    });
  }),

  /**
   * Bans a claim. Admins and the issuer of the claim's bounty can do this,
   * with a fresh signature for every ban. The bounty comes from the claim
   * itself, so an issuer can only ban claims on their own bounties.
   */
  banClaim: baseProcedure.input(banInput).mutation(async ({ input }) => {
    const claim = await prisma.claims.findUnique({
      where: { id_chainId: { id: input.id, chainId: input.chainId } },
      select: { bountyId: true },
    });

    if (!claim) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Claim not found' });
    }

    const isIssuer = await checkIsIssuer({
      address: input.address,
      bountyId: claim.bountyId,
      chainId: input.chainId,
    });

    if (!checkIsAdmin(input.address) && !isIssuer) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Not authorized to perform this action',
      });
    }

    await verifyBanSignature({ ...input, type: 'claim' });

    await prisma.ban.create({
      data: {
        chainId: input.chainId,
        bannedBy: input.address.toLowerCase(),
        claimId: input.id,
      },
    });
  }),

  /**
   * Hides a comment and its replies. Admins only, with a fresh signature for
   * every ban.
   */
  banComment: baseProcedure.input(banInput).mutation(async ({ input }) => {
    if (!checkIsAdmin(input.address)) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Not authorized to perform this action',
      });
    }

    await verifyBanSignature({ ...input, type: 'comment' });

    const comment = await prisma.comments.findFirst({
      where: { id: input.id, chainId: input.chainId },
    });

    if (!comment) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Comment not found',
      });
    }

    await prisma.comments.updateMany({
      where: { OR: [{ id: input.id }, { parentId: input.id }] },
      data: { deletedAt: new Date() },
    });
  }),
};

/**
 * Checks a ban signature: that it's from the given address and covers this
 * item and nonce, and that the nonce hasn't been used. Then uses up the
 * nonce so the same signature can't ban again.
 */
async function verifyBanSignature({
  type,
  id,
  chainId,
  nonce,
  address,
  signature,
}: {
  type: 'bounty' | 'claim' | 'comment';
  id: number;
  chainId: number;
  nonce: string;
  address: `0x${string}`;
  signature: `0x${string}`;
}) {
  const isValid = await chains.base.provider.verifyMessage({
    message: getBanMessage({ type, id, chainId, nonce }),
    address,
    signature,
  });

  if (!isValid) {
    throw new TRPCError({
      code: 'UNPROCESSABLE_CONTENT',
      message: 'Signature is invalid',
    });
  }

  if (!(await claimNonce(nonce))) {
    throw new TRPCError({
      code: 'UNPROCESSABLE_CONTENT',
      message: 'This ban request has expired or was already used',
    });
  }
}

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
    where: { id_chainId: { id: bountyId, chainId } },
  });

  return address.toLocaleLowerCase() === bounty.issuer;
}
