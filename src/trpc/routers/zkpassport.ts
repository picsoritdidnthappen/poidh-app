import { authedProcedure, baseProcedure } from '../init';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import type { RequestSuccess } from '@zkpassport/sdk';
import prisma from 'prisma/prisma';
import { verifyNationalityProof } from '../zkpassport';

const proofSchema = z.object({
  proof: z.string().max(1_000_000).optional(),
  vkeyHash: z.string().max(200).optional(),
  version: z.string().max(50).optional(),
  name: z.string().max(200).optional(),
  committedInputs: z.record(z.string(), z.unknown()).optional(),
  index: z.number().int().optional(),
  total: z.number().int().optional(),
});

export const zkpassportRouter = {
  verify: authedProcedure
    .input(
      z.object({
        proofs: z.array(proofSchema).min(1).max(20),
        queryResult: z.record(z.string(), z.unknown()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { address } = ctx.session;

      const verification = ctx.host
        ? await verifyNationalityProof({
            host: ctx.host,
            address,
            proofs: input.proofs as RequestSuccess['proofs'],
            queryResult: input.queryResult as RequestSuccess['result'],
          })
        : null;

      if (!verification) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Passport proof is invalid',
        });
      }

      const { uniqueIdentifier, country } = verification;

      const linked = await prisma.usersExtra.findUnique({
        where: { zkpassportUniqueId: uniqueIdentifier },
        select: { address: true },
      });

      if (linked && linked.address !== address) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This passport is already linked to another wallet',
        });
      }

      await prisma.usersExtra.upsert({
        where: { address },
        create: {
          address,
          zkpassportCountry: country,
          zkpassportUniqueId: uniqueIdentifier,
          zkpassportVerifiedAt: new Date(),
        },
        update: {
          zkpassportCountry: country,
          zkpassportUniqueId: uniqueIdentifier,
          zkpassportVerifiedAt: new Date(),
        },
      });

      return { success: true };
    }),

  status: baseProcedure
    .input(z.object({ address: z.string() }))
    .query(async ({ input }) => {
      const user = await prisma.usersExtra.findUnique({
        where: { address: input.address.toLowerCase() },
        select: {
          zkpassportCountry: true,
          zkpassportVerifiedAt: true,
        },
      });

      return {
        verified: !!user?.zkpassportCountry,
        country: user?.zkpassportCountry ?? null,
      };
    }),
};
