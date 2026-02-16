import { baseProcedure } from '../init';
import { z } from 'zod';
import prisma from 'prisma/prisma';

export const zkpassportRouter = {
  verify: baseProcedure
    .input(
      z.object({
        address: z.string(),
        country: z.string().min(1).max(10),
        uniqueIdentifier: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const address = input.address.toLowerCase();

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
