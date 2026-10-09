import { NextRequest, NextResponse } from 'next/server';
import prisma from 'prisma/prisma';
import type { Netname, ChainId, Currency } from '@/utils/types';
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

const APP_URL = 'https://poidh.xyz';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=30, stale-while-revalidate=300',
};

function isVoteStartAction(action: string) {
  return action.toLowerCase().includes('submitted for vote');
}

function isVoteResolutionAction(action: string) {
  const normalized = action
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return (
    normalized.includes('vote resolved') ||
    normalized.includes('voting resolved') ||
    normalized.includes('resolved vote') ||
    normalized.includes('resolved voting') ||
    (normalized.includes('resolve') &&
      (normalized.includes('vote') || normalized.includes('voting')))
  );
}

function getVotingState(bounty: {
  isVoting: boolean;
  isCanceled: boolean;
  transactions: {
    action: string;
    tx: string;
    timestamp: bigint | number | string;
  }[];
}) {
  const latestVoteStart = bounty.transactions.find((transaction) =>
    isVoteStartAction(transaction.action)
  );

  const latestVoteResolution = bounty.transactions.find((transaction) =>
    isVoteResolutionAction(transaction.action)
  );

  const voteStartedAt = latestVoteStart?.timestamp ?? null;
  const voteResolvedAt = latestVoteResolution?.timestamp ?? null;

  const voteResolved =
    latestVoteStart != null &&
    latestVoteResolution != null &&
    BigInt(String(latestVoteResolution.timestamp)) >=
      BigInt(String(latestVoteStart.timestamp));

  const votingInProgress =
    bounty.isVoting && !voteResolved && !bounty.isCanceled;

  return {
    votingInProgress,
    voteResolved,
    voteStartedAt,
    voteResolvedAt,
    voteStartTx: latestVoteStart?.tx ?? null,
    voteResolveTx: latestVoteResolution?.tx ?? null,
  };
}

function getBountyStatus(
  bounty: {
    inProgress: boolean;
    isCanceled: boolean;
  },
  votingInProgress: boolean
) {
  if (bounty.isCanceled) {
    return {
      status: 'canceled',
      statusLabel: 'Canceled',
      statusEmoji: '❌',
      acceptingClaims: false,
    };
  }

  if (!bounty.inProgress) {
    return {
      status: 'completed',
      statusLabel: 'Completed',
      statusEmoji: '✅',
      acceptingClaims: false,
    };
  }

  return {
    status: 'in_progress',
    statusLabel: 'In progress',
    statusEmoji: '💰',
    acceptingClaims: !votingInProgress,
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
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
      where: {
        id_chainId: {
          id,
          chainId,
        },
      },
      include: {
        claims: {
          where: {
            ban: {
              none: {},
            },
          },
          select: {
            id: true,
          },
          take: 1,
        },
        ban: {
          take: 1,
        },
        participations: {
          select: {
            userAddress: true,
          },
          take: 2,
        },
        extra: true,
        transactions: {
          select: {
            action: true,
            tx: true,
            timestamp: true,
          },
          orderBy: {
            timestamp: 'desc',
          },
        },
      },
    });

    const {
      claims: claimsPreview,
      participations,
      extra,
      transactions,
      ...bountyData
    } = bounty;

    const { amountSort, ...extraData } = extra;

    const votingState = getVotingState({
      isVoting: bounty.isVoting,
      isCanceled: bounty.isCanceled,
      transactions,
    });

    const bountyStatus = getBountyStatus(
      bounty,
      votingState.votingInProgress
    );

    const [claims, comments] = await Promise.all([
      prisma.claims.findMany({
        where: {
          bountyId: id,
          chainId,
          ban: {
            none: {},
          },
        },
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

    const claimsData = claims.map((claim) => {
      const issuerLower = claim.issuer.toLowerCase();
      const neynarUser = neynarByAddress.get(issuerLower);

      return {
        claimId: claim.id,
        uri: claim.url,
        isAccepted: claim.isAccepted,
        issuerAddress: claim.issuer,
        issuerName: nameByAddress.get(issuerLower) ?? null,
        farcasterHandle: neynarUser?.farcasterTag ?? null,
        twitterHandle: neynarUser?.twitterTag ?? null,
        profileUrl: `${APP_URL}/account/${issuerLower}`,
        profileDataUrl: `${APP_URL}/account/${issuerLower}/data`,
        title: claim.title,
        description: claim.description,
      };
    });

    const acceptedClaim = claimsData.find((claim) => claim.isAccepted);

    const winningClaim = acceptedClaim
      ? {
          claimId: acceptedClaim.claimId,
          title: acceptedClaim.title,
          description: acceptedClaim.description,
          uri: acceptedClaim.uri,
          winner: {
            address: acceptedClaim.issuerAddress,
            name: acceptedClaim.issuerName,
            farcasterHandle: acceptedClaim.farcasterHandle,
            twitterHandle: acceptedClaim.twitterHandle,
            profileUrl: acceptedClaim.profileUrl,
            profileDataUrl: acceptedClaim.profileDataUrl,
          },
        }
      : null;

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
        {
          upvotes: 0,
          downvotes: 0,
        }
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
        profileUrl: `${APP_URL}/account/${authorLower}`,
        profileDataUrl: `${APP_URL}/account/${authorLower}/data`,
        upvotes,
        downvotes,
      };
    });

    return NextResponse.json(
      {
        ...bountyData,

        extra: extraData,

        status: bountyStatus.status,
        statusLabel: bountyStatus.statusLabel,
        statusEmoji: bountyStatus.statusEmoji,
        acceptingClaims: bountyStatus.acceptingClaims,

        votingInProgress: votingState.votingInProgress,
        voteResolved: votingState.voteResolved,
        voteStartedAt: votingState.voteStartedAt,
        voteResolvedAt: votingState.voteResolvedAt,
        voteStartTx: votingState.voteStartTx,
        voteResolveTx: votingState.voteResolveTx,

        winningClaim,

        hasClaims: claimsPreview.length > 0,
        hasParticipants: participations.length > 1,
        priceUsd: amountSort,
        currency: CURRENCIES[slug],

        url: `${APP_URL}/${slug}/bounty/${id}`,
        skillUrl: `${APP_URL}/skill.md`,
        docsUrl: 'https://docs.poidh.xyz/',
        githubUrl:
          'https://github.com/picsoritdidnthappen/poidh-app',

        claims: claimsData,
        comments: commentsData,
      },
      {
        headers: {
          ...CORS_HEADERS,
          ...CACHE_HEADERS,
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: 'not found' },
      { status: 404, headers: CORS_HEADERS }
    );
  }
}
