import { NextRequest, NextResponse } from 'next/server';
import prisma from 'prisma/prisma';
import type { Netname, ChainId, Currency } from '@/utils/types';
import { fetchImageMetadata } from '@/trpc/routers/claims';
import { getUsersDataOrFetchItFromNeynar } from '@/trpc/routers/neynar';
import { getHumanReadableName } from '@/trpc/routers/web3';

const CHAIN_IDS: Record<Netname, ChainId> = {
  mainnet: 1,
  arbitrum: 42161,
  base: 8453,
  degen: 666666666,
};

const CURRENCIES: Record<Netname, Currency> = {
  mainnet: 'eth',
  arbitrum: 'eth',
  base: 'eth',
  degen: 'degen',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=30, stale-while-revalidate=300',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { netname: string; id: string } }
) {
  const slug = params.netname as Netname;
  const chainId = CHAIN_IDS[slug];
  const id = Number(params.id);

  if (!chainId) {
    return NextResponse.json(
      { error: 'unknown chain' },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  if (Number.isNaN(id)) {
    return NextResponse.json(
      { error: 'invalid bounty id' },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  try {
    const bounty = await prisma.bounties.findUniqueOrThrow({
      where: { id_chainId: { id, chainId } },
      include: {
        claims: { where: { ban: { none: {} } }, select: { id: true }, take: 1 },
        ban: { take: 1 },
        participations: { select: { userAddress: true }, take: 2 },
        extra: true,
      },
    });

    const {
      claims: claimsPreview,
      participations,
      extra,
      ...bountyData
    } = bounty;

    const { amountSort, ...extraData } = extra;

    const [claims, comments] = await Promise.all([
      prisma.claims.findMany({
        where: { bountyId: id, chainId, ban: { none: {} } },
        orderBy: [{ isAccepted: 'desc' }, { id: 'desc' }],
      }),
      prisma.comments.findMany({
        where: {
          bountyId: id,
          chainId,
          deletedAt: null,
        },
        include: {
          reactions: {
            select: {
              type: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      }),
    ]);

    const uniqueUsers = [
      ...new Set([
        ...claims.map((claim) => claim.issuer.toLowerCase()),
        ...comments.map((comment) => comment.userAddress.toLowerCase()),
      ]),
    ];

    const [neynarUsers, ...names] = await Promise.all([
      getUsersDataOrFetchItFromNeynar(uniqueUsers),
      ...uniqueUsers.map((addr) => getHumanReadableName(addr)),
    ]);

    const nameByAddress = new Map(
      uniqueUsers.map((addr, i) => [addr, names[i]])
    );

    const neynarByAddress = new Map(
      neynarUsers.map((user) => [user.address.toLowerCase(), user])
    );

    const claimsData = await Promise.all(
      claims.map(async (claim) => {
        const imageMetadata = await fetchImageMetadata(claim.url);
        const issuerLower = claim.issuer.toLowerCase();
        const neynarUser = neynarByAddress.get(issuerLower);

        return {
          claimId: claim.id,
          imageUrl: imageMetadata.image,
          issuerAddress: claim.issuer,
          issuerName: nameByAddress.get(issuerLower) ?? null,
          farcasterHandle: neynarUser?.farcasterTag ?? null,
          twitterHandle: neynarUser?.twitterTag ?? null,
          profileUrl: `https://poidh.xyz/account/${issuerLower}`,
          title: claim.title,
          description: claim.description,
        };
      })
    );

    const commentsData = comments.map((comment) => {
      const authorLower = comment.userAddress.toLowerCase();
      const neynarUser = neynarByAddress.get(authorLower);

      const { upvotes, downvotes } = comment.reactions.reduce(
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
        commentId: comment.id,
        parentId: comment.parentId,
        body: comment.body,
        createdAt: comment.createdAt,
        authorAddress: comment.userAddress,
        authorName: nameByAddress.get(authorLower) ?? null,
        farcasterHandle: neynarUser?.farcasterTag ?? null,
        twitterHandle: neynarUser?.twitterTag ?? null,
        profileUrl: `https://poidh.xyz/account/${authorLower}`,
        upvotes,
        downvotes,
      };
    });

    return NextResponse.json(
      {
        ...bountyData,
        extra: extraData,
        hasClaims: claimsPreview.length > 0,
        hasParticipants: participations.length > 1,
        priceUsd: amountSort,
        currency: CURRENCIES[slug],
        url: `https://poidh.xyz/${slug}/bounty/${id}`,
        claims: claimsData,
        comments: commentsData,
      },
      { headers: { ...CORS_HEADERS, ...CACHE_HEADERS } }
    );
  } catch {
    return NextResponse.json(
      { error: 'not found' },
      { status: 404, headers: CORS_HEADERS }
    );
  }
}
