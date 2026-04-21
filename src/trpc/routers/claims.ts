import { z } from 'zod';
import { baseProcedure } from '../init';
import prisma from 'prisma/prisma';
import axios from 'axios';
import { tryCatchAsync } from '@/utils/utils';
import { getClaimsNotBannedPrismaFilter } from '@/trpc/claimBanFilter';

export const claimsRouter = {
  fetch: baseProcedure
    .input(z.object({ claimId: z.number(), chainId: z.number() }))
    .query(async ({ input }) => {
      const claimBanWhere = await getClaimsNotBannedPrismaFilter();
      const claim = await prisma.claims.findFirstOrThrow({
        where: {
          AND: [{ id: input.claimId, chainId: input.chainId }, claimBanWhere],
        },
      });

      const imageMetadata = await fetchImageMetadata(claim.url);

      return {
        ...claim,
        url: imageMetadata.image,
      };
    }),

  fetchBountyClaims: baseProcedure
    .input(
      z.object({
        bountyId: z.number(),
        chainId: z.number(),
        limit: z.number().min(1).max(100).default(10),
        cursor: z.number().nullish(),
      })
    )
    .query(async ({ input }) => {
      const claimBanWhere = await getClaimsNotBannedPrismaFilter();
      const items = await prisma.claims.findMany({
        where: {
          bountyId: input.bountyId,
          chainId: input.chainId,
          ...claimBanWhere,
          ...(input.cursor
            ? { isAccepted: false, id: { lt: input.cursor } }
            : {}),
        },
        orderBy: [!input.cursor ? { isAccepted: 'desc' } : {}, { id: 'desc' }],
        take: input.limit,
      });

      let nextCursor: number | undefined = undefined;
      if (items.length === input.limit) {
        nextCursor = items[items.length - 1].id;
      }

      const normalizedItems = await Promise.all(
        items.map(async (claim) => {
          const imageMetadata = await fetchImageMetadata(claim.url);

          return {
            ...claim,
            url: imageMetadata.image,
          };
        })
      );

      return {
        items: normalizedItems,
        nextCursor,
      };
    }),

  fetchAcceptedClaimByBountyId: baseProcedure
    .input(z.object({ bountyId: z.number(), chainId: z.number() }))
    .query(async ({ input }) => {
      const claimBanWhere = await getClaimsNotBannedPrismaFilter();
      const claim = await prisma.claims.findFirst({
        where: {
          bountyId: input.bountyId,
          chainId: input.chainId,
          ...claimBanWhere,
          isAccepted: true,
        },
      });

      if (!claim) {
        return null;
      }

      const imageMetadata = await fetchImageMetadata(claim.url);

      return {
        ...claim,
        url: imageMetadata.image,
      };
    }),

  fetchVotingClaimByBountyId: baseProcedure
    .input(z.object({ bountyId: z.number(), chainId: z.number() }))
    .query(async ({ input }) => {
      const claimBanWhere = await getClaimsNotBannedPrismaFilter();
      const vote = await prisma.votes.findFirst({
        select: {
          claimId: true,
        },
        where: {
          ...input,
          bounty: {
            isVoting: true,
          },
        },
        orderBy: { round: 'desc' },
        take: 1,
      });

      if (!vote) {
        return null;
      }

      const claim = await prisma.claims.findFirst({
        where: {
          id: vote.claimId,
          chainId: input.chainId,
          ...claimBanWhere,
        },
      });

      if (!claim) {
        return null;
      }

      const imageMetadata = await fetchImageMetadata(claim.url);

      return {
        ...claim,
        url: imageMetadata.image,
      };
    }),

  isCreated: baseProcedure
    .input(z.object({ chainId: z.number(), id: z.number() }))
    .query(async ({ input }) => {
      return prisma.claims.findUnique({
        where: {
          id_chainId: {
            id: input.id,
            chainId: input.chainId,
          },
        },
      });
    }),

  isAccepted: baseProcedure
    .input(z.object({ chainId: z.number(), id: z.number() }))
    .query(async ({ input }) => {
      return prisma.claims.findUnique({
        where: {
          id_chainId: {
            id: input.id,
            chainId: input.chainId,
          },
          isAccepted: true,
        },
      });
    }),
};

export async function fetchImageMetadata(url: string) {
  const [response, _] = await tryCatchAsync(async () => axios.get(url));

  if (!response?.data) {
    return {
      name: null,
      description: null,
      external_url: null,
      image: null,
      attributes: null,
    };
  }

  const responseSchema = z.object({
    name: z.string(),
    description: z.string(),
    external_url: z.string(),
    image: z.string(),
    attributes: z.array(z.any()),
  });

  const parsed = responseSchema.safeParse(response.data);

  if (!parsed.data) {
    return {
      name: null,
      description: null,
      external_url: null,
      image: null,
      attributes: null,
    };
  }

  return parsed.data;
}
