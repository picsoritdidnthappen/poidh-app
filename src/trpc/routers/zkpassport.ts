import { authedProcedure, baseProcedure } from '../init';
import { z } from 'zod';
import prisma from 'prisma/prisma';

export const zkpassportRouter = {
  /**
   * Saves the signed-in user's zkPassport nationality badge.
   */
  verify: authedProcedure
    .input(
      z.object({
        country: z.string().min(1).max(10),
        uniqueIdentifier: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { address } = ctx.session;

      await prisma.usersExtra.upsert({
        where: { address },
        create: {
          address,
          zkpassportCountry: input.country,
          zkpassportVerifiedAt: new Date(),
        },
        update: {
          zkpassportCountry: input.country,
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
