import { z } from 'zod';
import { baseProcedure } from '../init';
import prisma from 'prisma/prisma';
import axios from 'axios';

const DIRECT_MEDIA_EXTENSIONS =
  /\.(avif|bmp|gif|jpe?g|png|svg|webp|mp4|mov|webm|ogg)(\?.*)?$/i;

const emptyMetadata = {
  name: null,
  description: null,
  external_url: null,
  image: null,
  attributes: null,
};

export const claimsRouter = {
  fetch: baseProcedure
    .input(z.object({ claimId: z.number(), chainId: z.number() }))
    .query(async ({ input }) => {
      const claim = await prisma.claims.findUniqueOrThrow({
        where: {
          id_chainId: {
            id: input.claimId,
            chainId: input.chainId,
          },
          ban: {
            none: {},
          },
        },
      });

      const imageMetadata = await fetchImageMetadata(claim.url);

      return {
        ...claim,
        url: imageMetadata.image ?? claim.url,
      };
    }),

  /*
   * Lightweight homepage query.
   *
   * Important:
   * - only asks for actual "claim created" transactions
   * - does NOT resolve IPFS/media metadata on the server
   * - does NOT scan/paginate through the general activity feed
   */
  fetchLatest: baseProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(30).default(15),
      })
    )
    .query(async ({ input }) => {
      const txs = await prisma.transactions.findMany({
        where: {
          action: 'claim created',
          claimId: {
            not: null,
          },
          bounty: {
            ban: {
              none: {},
            },
          },
          claim: {
            is: {
              ban: {
                none: {},
              },
            },
          },
        },
        select: {
          bountyId: true,
          chainId: true,
          claim: {
            select: {
              id: true,
              chainId: true,
              title: true,
              url: true,
              issuer: true,
            },
          },
          bounty: {
            select: {
              id: true,
              chainId: true,
            },
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
        take: input.limit,
      });

      return txs.flatMap((tx) => {
        if (!tx.claim) {
          return [];
        }

        return [
          {
            claim: tx.claim,
            bountyId: tx.bounty?.id ?? tx.bountyId,
            chainId: tx.bounty?.chainId ?? tx.chainId,
          },
        ];
      });
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
      const items = await prisma.claims.findMany({
        where: {
          bountyId: input.bountyId,
          chainId: input.chainId,
          ban: {
            none: {},
          },
          ...(input.cursor
            ? { isAccepted: false, id: { lt: input.cursor } }
            : {}),
        },
        orderBy: [
          !input.cursor ? { isAccepted: 'desc' } : {},
          { id: 'desc' },
        ],
        take: input.limit,
      });

      let nextCursor: number | undefined = undefined;

      if (items.length === input.limit) {
        nextCursor = items[items.length - 1].id;
      }

      return {
        items,
        nextCursor,
      };
    }),

  fetchAcceptedClaimByBountyId: baseProcedure
    .input(z.object({ bountyId: z.number(), chainId: z.number() }))
    .query(async ({ input }) => {
      const claim = await prisma.claims.findFirst({
        where: {
          bountyId: input.bountyId,
          chainId: input.chainId,
          ban: {
            none: {},
          },
          isAccepted: true,
        },
      });

      if (!claim) {
        return null;
      }

      const imageMetadata = await fetchImageMetadata(claim.url);

      return {
        ...claim,
        url: imageMetadata.image ?? claim.url,
      };
    }),

  fetchVotingClaimByBountyId: baseProcedure
    .input(z.object({ bountyId: z.number(), chainId: z.number() }))
    .query(async ({ input }) => {
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
          ban: {
            none: {},
          },
        },
      });

      if (!claim) {
        return null;
      }

      const imageMetadata = await fetchImageMetadata(claim.url);

      return {
        ...claim,
        url: imageMetadata.image ?? claim.url,
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
  if (!url || typeof url !== 'string') {
    return emptyMetadata;
  }

  /*
   * Obvious direct media URLs do not need to be downloaded and parsed
   * as NFT metadata.
   */
  if (DIRECT_MEDIA_EXTENSIONS.test(url)) {
    return {
      ...emptyMetadata,
      image: url,
    };
  }

  /*
   * First try a small HEAD request.
   * This lets extensionless IPFS image/video URLs resolve without
   * downloading the entire media file.
   */
  try {
    const headResponse = await axios.head(url, {
      timeout: 2000,
      maxRedirects: 5,
    });

    const contentType = String(
      headResponse.headers['content-type'] ?? ''
    ).toLowerCase();

    if (
      contentType.startsWith('image/') ||
      contentType.startsWith('video/')
    ) {
      return {
        ...emptyMetadata,
        image: url,
      };
    }
  } catch {
    // Some gateways do not support HEAD. Fall through to metadata fetch.
  }

  /*
   * Metadata fetch is deliberately bounded.
   *
   * We only need small JSON metadata here. A broken gateway or giant
   * response should never hold a tRPC request open indefinitely.
   */
  try {
    const response = await axios.get(url, {
      timeout: 3000,
      maxRedirects: 5,
      maxContentLength: 512 * 1024,
      maxBodyLength: 512 * 1024,
    });

    if (!response?.data) {
      return emptyMetadata;
    }

    const responseSchema = z.object({
      name: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      external_url: z.string().nullable().optional(),
      image: z.string(),
      attributes: z.array(z.any()).nullable().optional(),
    });

    const parsed = responseSchema.safeParse(response.data);

    if (!parsed.success) {
      return emptyMetadata;
    }

    return {
      name: parsed.data.name ?? null,
      description: parsed.data.description ?? null,
      external_url: parsed.data.external_url ?? null,
      image: parsed.data.image,
      attributes: parsed.data.attributes ?? null,
    };
  } catch {
    return emptyMetadata;
  }
}
