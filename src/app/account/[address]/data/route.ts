import { NextRequest, NextResponse } from 'next/server';
import { formatEther, isAddress } from 'viem';
import prisma from 'prisma/prisma';
import { getQueryClient, trpc } from '@/trpc/server';
import { getUsersDataOrFetchItFromNeynar } from '@/trpc/routers/neynar';
import { getHumanReadableName } from '@/trpc/routers/web3';
import {
  ARBITRUM_LAST_PRE_V3_BOUNTY,
  BASE_LAST_PRE_V3_BOUNTY,
  DEGEN_LAST_PRE_V3_BOUNTY,
} from '@/utils/constants';

const APP_URL = 'https://poidh.xyz';

const CHAIN_SLUGS: Record<number, string> = {
  1: 'mainnet',
  42161: 'arbitrum',
  8453: 'base',
  666666666: 'degen',
};

const CHAIN_CURRENCIES: Record<number, string> = {
  1: 'eth',
  42161: 'eth',
  8453: 'eth',
  666666666: 'degen',
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=30, stale-while-revalidate=300',
};

const bountySummarySelect = {
  id: true,
  onChainId: true,
  chainId: true,
  title: true,
  description: true,
  amount: true,
  issuer: true,
  createdAt: true,
  inProgress: true,
  isJoinedBounty: true,
  isCanceled: true,
  isMultiplayer: true,
  isVoting: true,
  deadline: true,

  extra: {
    select: {
      album: true,
      amountSort: true,
    },
  },

  // Accepted claim = bounty winner.
  claims: {
    where: {
      isAccepted: true,
      ban: {
        none: {},
      },
    },
    select: {
      id: true,
      onChainId: true,
      chainId: true,
      title: true,
      issuer: true,
    },
    take: 1,
  },
} as const;

const claimSelect = {
  id: true,
  onChainId: true,
  chainId: true,
  title: true,
  description: true,
  url: true,
  issuer: true,
  owner: true,
  isAccepted: true,
  bountyId: true,

  // Claims do not currently have createdAt in Prisma.
  // The earliest indexed transaction associated with the claim
  // gives us a useful chronological timestamp.
  transactions: {
    orderBy: {
      timestamp: 'asc',
    },
    take: 1,
    select: {
      tx: true,
      timestamp: true,
    },
  },

  bounty: {
    select: bountySummarySelect,
  },
} as const;

function getBountyUrls(chainId: number, bountyId: number) {
  const slug = CHAIN_SLUGS[chainId];

  if (!slug) {
    return {
      url: null,
      dataUrl: null,
    };
  }

  const url = `${APP_URL}/${slug}/bounty/${bountyId}`;

  return {
    url,
    dataUrl: `${url}/data`,
  };
}

function getNetworkInfo(chainId: number, bountyId: number) {
  let protocolVersion: 'v2' | 'v3' | 'unknown' = 'unknown';

  if (chainId === 1) {
    protocolVersion = 'v3';
  } else if (chainId === 42161) {
    protocolVersion =
      bountyId <= ARBITRUM_LAST_PRE_V3_BOUNTY ? 'v2' : 'v3';
  } else if (chainId === 8453) {
    protocolVersion =
      bountyId <= BASE_LAST_PRE_V3_BOUNTY ? 'v2' : 'v3';
  } else if (chainId === 666666666) {
    protocolVersion =
      bountyId <= DEGEN_LAST_PRE_V3_BOUNTY ? 'v2' : 'v3';
  }

  const networkStatus =
    chainId === 666666666 ? 'retired' : 'active';

  return {
    networkStatus,
    protocolVersion,

    // This only describes whether this record belongs to a currently
    // supported protocol/network combination. The bounty's own status
    // still determines whether any action is actually possible.
    liveProtocolSupported:
      networkStatus === 'active' && protocolVersion === 'v3',
  };
}

function getBountyStatus(bounty: {
  isCanceled: boolean;
  inProgress: boolean;
  isVoting: boolean;
}) {
  if (bounty.isCanceled) {
    return {
      status: 'canceled' as const,
      statusEmoji: '❌',
      acceptingClaims: false,
    };
  }

  if (!bounty.inProgress) {
    return {
      status: 'completed' as const,
      statusEmoji: '✅',
      acceptingClaims: false,
    };
  }

  return {
    status: 'in_progress' as const,
    statusEmoji: '💰',

    // An in-progress bounty with an active vote should not be treated
    // as currently accepting another claim.
    acceptingClaims: !bounty.isVoting,
  };
}

function getClaimStatus(
  claim: { isAccepted: boolean },
  bounty: {
    isCanceled: boolean;
    inProgress: boolean;
  }
) {
  if (claim.isAccepted) {
    return 'won' as const;
  }

  if (bounty.isCanceled) {
    return 'bounty_canceled' as const;
  }

  if (!bounty.inProgress) {
    return 'not_selected' as const;
  }

  return 'pending' as const;
}

function formatAmount(amount: string | null) {
  if (amount === null) {
    return null;
  }

  try {
    return formatEther(BigInt(amount));
  } catch {
    return null;
  }
}

function getReactionCounts(
  reactions: {
    type: string;
  }[]
) {
  return reactions.reduce(
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
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { address: string } }
) {
  if (!isAddress(params.address)) {
    return NextResponse.json(
      { error: 'invalid address' },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const address = params.address.toLowerCase();

  try {
    const queryClient = getQueryClient();

    const statsPromise = queryClient
      .query(
        trpc.accounts.stats.queryOptions({
          address,
        })
      )
      .catch(() => null);

    const [
      stats,
      createdBounties,
      fundedParticipations,
      submittedClaims,
      ownedNfts,
      authoredComments,
    ] = await Promise.all([
      statsPromise,

      // Every public bounty created by this wallet.
      prisma.bounties.findMany({
        where: {
          issuer: address,
          ban: {
            none: {},
          },
        },
        select: bountySummarySelect,
      }),

      // Every public bounty this wallet contributed funds to.
      prisma.participationsBounties.findMany({
        where: {
          userAddress: address,
          bounty: {
            ban: {
              none: {},
            },
          },
        },
        select: {
          amount: true,
          bountyId: true,
          chainId: true,
          bounty: {
            select: bountySummarySelect,
          },
        },
      }),

      // Every public claim submitted by this wallet.
      prisma.claims.findMany({
        where: {
          issuer: address,
          ban: {
            none: {},
          },
          bounty: {
            ban: {
              none: {},
            },
          },
        },
        select: claimSelect,
        orderBy: {
          id: 'desc',
        },
      }),

      // Every public claim NFT currently held by this wallet.
      prisma.claims.findMany({
        where: {
          owner: address,
          ban: {
            none: {},
          },
          bounty: {
            ban: {
              none: {},
            },
          },
        },
        select: claimSelect,
        orderBy: {
          id: 'desc',
        },
      }),

      // Public comments authored by this wallet.
      prisma.comments.findMany({
        where: {
          userAddress: address,
          deletedAt: null,
          bounty: {
            ban: {
              none: {},
            },
          },
        },
        select: {
          id: true,
          bountyId: true,
          chainId: true,
          parentId: true,
          userAddress: true,
          body: true,
          createdAt: true,

          reactions: {
            select: {
              type: true,
            },
          },

          bounty: {
            select: bountySummarySelect,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    /*
     * Resolve visible parent comments so an agent can understand
     * who this user was replying to without exposing deleted comments.
     */
    const parentIds = [
      ...new Set(
        authoredComments
          .map((comment) => comment.parentId)
          .filter((id): id is number => id !== null)
      ),
    ];

    const parentComments =
      parentIds.length > 0
        ? await prisma.comments.findMany({
            where: {
              id: {
                in: parentIds,
              },
              deletedAt: null,
            },
            select: {
              id: true,
              body: true,
              userAddress: true,
            },
          })
        : [];

    const parentCommentById = new Map(
      parentComments.map((comment) => [comment.id, comment])
    );

    /*
     * Gather every user address referenced anywhere in this profile:
     *
     * - profile owner
     * - bounty creators
     * - bounty winners
     * - current owners of submitted claim NFTs
     * - original claimants of NFTs now held by this user
     * - users this person replied to
     */
    const identityAddresses: string[] = [address];

    const addBountyIdentities = (
      bounty: (typeof createdBounties)[number]
    ) => {
      identityAddresses.push(bounty.issuer.toLowerCase());

      const winningClaim = bounty.claims[0];

      if (winningClaim) {
        identityAddresses.push(winningClaim.issuer.toLowerCase());
      }
    };

    createdBounties.forEach(addBountyIdentities);

    fundedParticipations.forEach((participation) => {
      addBountyIdentities(participation.bounty);
    });

    submittedClaims.forEach((claim) => {
      identityAddresses.push(claim.owner.toLowerCase());
      addBountyIdentities(claim.bounty);
    });

    ownedNfts.forEach((claim) => {
      identityAddresses.push(claim.issuer.toLowerCase());
      addBountyIdentities(claim.bounty);
    });

    authoredComments.forEach((comment) => {
      addBountyIdentities(comment.bounty);
    });

    parentComments.forEach((comment) => {
      identityAddresses.push(comment.userAddress.toLowerCase());
    });

    const uniqueAddresses = [...new Set(identityAddresses)];

    /*
     * Social-profile resolution should not make the entire endpoint fail.
     * If Neynar/ENS resolution fails, the core account history still returns.
     */
    const [neynarUsers, names] = await Promise.all([
      getUsersDataOrFetchItFromNeynar(uniqueAddresses).catch(() => []),

      Promise.all(
        uniqueAddresses.map(async (userAddress) => {
          try {
            return await getHumanReadableName(userAddress);
          } catch {
            return null;
          }
        })
      ),
    ]);

    const nameByAddress = new Map(
      uniqueAddresses.map((userAddress, index) => [
        userAddress,
        names[index],
      ])
    );

    const neynarByAddress = new Map(
      neynarUsers.map((user) => [
        user.address.toLowerCase(),
        user,
      ])
    );

    const getIdentity = (userAddress: string) => {
      const normalized = userAddress.toLowerCase();
      const neynarUser = neynarByAddress.get(normalized);

      return {
        address: normalized,
        name: nameByAddress.get(normalized) ?? null,
        farcasterHandle: neynarUser?.farcasterTag ?? null,
        twitterHandle: neynarUser?.twitterTag ?? null,
        pfpUrl: neynarUser?.pfpUrl ?? null,

        // These links deliberately make the social graph crawlable.
        profileUrl: `${APP_URL}/account/${normalized}`,
        profileDataUrl: `${APP_URL}/account/${normalized}/data`,
      };
    };

    const buildBountyReference = (
      bounty: (typeof createdBounties)[number]
    ) => {
      const urls = getBountyUrls(bounty.chainId, bounty.id);
      const status = getBountyStatus(bounty);
      const network = getNetworkInfo(bounty.chainId, bounty.id);
      const winningClaim = bounty.claims[0] ?? null;

      return {
        bountyId: bounty.id,
        onChainId: bounty.onChainId,
        chainId: bounty.chainId,
        chain: CHAIN_SLUGS[bounty.chainId] ?? null,
        currency: CHAIN_CURRENCIES[bounty.chainId] ?? null,

        ...network,

        title: bounty.title,

        ...status,

        votingInProgress: bounty.isVoting,
        inProgress: bounty.inProgress,
        isCanceled: bounty.isCanceled,

        url: urls.url,
        dataUrl: urls.dataUrl,

        creator: getIdentity(bounty.issuer),

        winningClaim: winningClaim
          ? {
              claimId: winningClaim.id,
              onChainId: winningClaim.onChainId,
              title: winningClaim.title,

              // The winner is the accepted claim's issuer, not the
              // current NFT owner.
              winner: getIdentity(winningClaim.issuer),
            }
          : null,
      };
    };

    /*
     * Merge bounties created by this user with bounties they funded.
     * Preserve both relationships when both are true.
     */
    const bountyMap = new Map<
      string,
      {
        bounty: (typeof createdBounties)[number];
        createdByProfile: boolean;
        fundedByProfile: boolean;
        contributionAmount: string | null;
      }
    >();

    for (const bounty of createdBounties) {
      bountyMap.set(`${bounty.chainId}-${bounty.id}`, {
        bounty,
        createdByProfile: true,
        fundedByProfile: false,
        contributionAmount: null,
      });
    }

    for (const participation of fundedParticipations) {
      const bounty = participation.bounty;
      const key = `${bounty.chainId}-${bounty.id}`;
      const existing = bountyMap.get(key);

      if (existing) {
        existing.fundedByProfile = true;
        existing.contributionAmount = participation.amount;
      } else {
        bountyMap.set(key, {
          bounty,
          createdByProfile: false,
          fundedByProfile: true,
          contributionAmount: participation.amount,
        });
      }
    }

    const bountiesData = Array.from(bountyMap.values())
      .sort(
        (a, b) =>
          Number(b.bounty.createdAt) -
          Number(a.bounty.createdAt)
      )
      .map(
        ({
          bounty,
          createdByProfile,
          fundedByProfile,
          contributionAmount,
        }) => {
          return {
            ...buildBountyReference(bounty),

            description: bounty.description,

            amount: bounty.amount,
            amountFormatted: formatAmount(bounty.amount),
            priceUsd: bounty.extra.amountSort,

            createdAt: bounty.createdAt.toString(),
            deadline: bounty.deadline,

            isMultiplayer: bounty.isMultiplayer,
            isJoinedBounty: bounty.isJoinedBounty,
            album: bounty.extra.album,

            relationship: {
              createdByProfile,
              fundedByProfile,

              contributionAmount,
              contributionAmountFormatted:
                formatAmount(contributionAmount),
            },
          };
        }
      );

    const claimsData = submittedClaims
      .map((claim) => {
        const createdTransaction =
          claim.transactions[0] ?? null;

        return {
          claimId: claim.id,
          onChainId: claim.onChainId,
          chainId: claim.chainId,
          chain: CHAIN_SLUGS[claim.chainId] ?? null,

          title: claim.title,
          description: claim.description,
          proofUri: claim.url,

          createdAt:
            createdTransaction?.timestamp.toString() ?? null,

          creationTx: createdTransaction?.tx ?? null,

          isAccepted: claim.isAccepted,

          claimStatus: getClaimStatus(
            claim,
            claim.bounty
          ),

          // Useful if a submitted NFT has since changed hands.
          currentOwner: getIdentity(claim.owner),

          bounty: buildBountyReference(claim.bounty),
        };
      })
      .sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return Number(b.createdAt) - Number(a.createdAt);
        }

        return b.claimId - a.claimId;
      });

    const nftsData = ownedNfts
      .map((claim) => {
        const createdTransaction =
          claim.transactions[0] ?? null;

        return {
          claimId: claim.id,
          onChainId: claim.onChainId,
          chainId: claim.chainId,
          chain: CHAIN_SLUGS[claim.chainId] ?? null,

          title: claim.title,
          description: claim.description,
          proofUri: claim.url,

          createdAt:
            createdTransaction?.timestamp.toString() ?? null,

          isAccepted: claim.isAccepted,

          claimStatus: getClaimStatus(
            claim,
            claim.bounty
          ),

          currentOwner: getIdentity(address),

          // Important distinction: the current holder may not be
          // the person who originally submitted the claim.
          originalClaimant: getIdentity(claim.issuer),

          bounty: buildBountyReference(claim.bounty),
        };
      })
      .sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return Number(b.createdAt) - Number(a.createdAt);
        }

        return b.claimId - a.claimId;
      });

    const commentsData = authoredComments.map((comment) => {
      const parent =
        comment.parentId !== null
          ? parentCommentById.get(comment.parentId) ?? null
          : null;

      const reactions = getReactionCounts(
        comment.reactions
      );

      return {
        commentId: comment.id,
        parentId: comment.parentId,
        body: comment.body,
        createdAt: comment.createdAt.toISOString(),

        upvotes: reactions.upvotes,
        downvotes: reactions.downvotes,

        replyTo: parent
          ? {
              commentId: parent.id,
              body: parent.body,
              author: getIdentity(parent.userAddress),
            }
          : null,

        bounty: buildBountyReference(comment.bounty),
      };
    });

    /*
     * Build a compact people graph in addition to putting profile links
     * inline everywhere.
     *
     * An agent can crawl this directly without first parsing every
     * bounty/claim/comment object.
     */
    const relatedUsersMap = new Map<
      string,
      {
        user: ReturnType<typeof getIdentity>;
        relationships: Set<string>;
        bountyUrls: Set<string>;
      }
    >();

    const addRelatedUser = (
      user: ReturnType<typeof getIdentity>,
      relationship: string,
      bountyUrl?: string | null
    ) => {
      if (user.address === address) {
        return;
      }

      const existing = relatedUsersMap.get(user.address);

      if (existing) {
        existing.relationships.add(relationship);

        if (bountyUrl) {
          existing.bountyUrls.add(bountyUrl);
        }

        return;
      }

      relatedUsersMap.set(user.address, {
        user,
        relationships: new Set([relationship]),
        bountyUrls: new Set(
          bountyUrl ? [bountyUrl] : []
        ),
      });
    };

    bountiesData.forEach((bounty) => {
      if (
        bounty.relationship.fundedByProfile &&
        !bounty.relationship.createdByProfile
      ) {
        addRelatedUser(
          bounty.creator,
          'created_bounty_profile_funded',
          bounty.url
        );
      }

      if (bounty.winningClaim) {
        addRelatedUser(
          bounty.winningClaim.winner,
          'won_related_bounty',
          bounty.url
        );
      }
    });

    claimsData.forEach((claim) => {
      addRelatedUser(
        claim.bounty.creator,
        'created_bounty_profile_claimed',
        claim.bounty.url
      );

      if (claim.bounty.winningClaim) {
        addRelatedUser(
          claim.bounty.winningClaim.winner,
          'won_bounty_profile_claimed',
          claim.bounty.url
        );
      }

      addRelatedUser(
        claim.currentOwner,
        'current_owner_of_profile_submitted_claim_nft',
        claim.bounty.url
      );
    });

    nftsData.forEach((nft) => {
      addRelatedUser(
        nft.originalClaimant,
        'original_claimant_of_profile_held_nft',
        nft.bounty.url
      );

      addRelatedUser(
        nft.bounty.creator,
        'created_bounty_for_profile_held_nft',
        nft.bounty.url
      );

      if (nft.bounty.winningClaim) {
        addRelatedUser(
          nft.bounty.winningClaim.winner,
          'won_bounty_for_profile_held_nft',
          nft.bounty.url
        );
      }
    });

    commentsData.forEach((comment) => {
      addRelatedUser(
        comment.bounty.creator,
        'created_bounty_profile_commented_on',
        comment.bounty.url
      );

      if (comment.replyTo) {
        addRelatedUser(
          comment.replyTo.author,
          'profile_replied_to',
          comment.bounty.url
        );
      }
    });

    const relatedUsers = Array.from(
      relatedUsersMap.values()
    ).map(({ user, relationships, bountyUrls }) => ({
      ...user,
      relationships: Array.from(relationships),
      relatedBountyUrls: Array.from(bountyUrls),
    }));

    const claimsWon = claimsData.filter(
      (claim) => claim.claimStatus === 'won'
    ).length;

    const claimsPending = claimsData.filter(
      (claim) => claim.claimStatus === 'pending'
    ).length;

    const claimsNotSelected = claimsData.filter(
      (claim) => claim.claimStatus === 'not_selected'
    ).length;

    const claimsOnCanceledBounties = claimsData.filter(
      (claim) => claim.claimStatus === 'bounty_canceled'
    ).length;

    return NextResponse.json(
      {
        address,

        profile: getIdentity(address),

        profileUrl: `${APP_URL}/account/${address}`,
        dataUrl: `${APP_URL}/account/${address}/data`,
        skillUrl: `${APP_URL}/skill.md`,

        poidhScore:
          stats !== null
            ? Number(stats.poidhScore)
            : null,

        summary: {
          bounties: bountiesData.length,

          bountiesCreated: bountiesData.filter(
            (bounty) =>
              bounty.relationship.createdByProfile
          ).length,

          bountiesFunded: bountiesData.filter(
            (bounty) =>
              bounty.relationship.fundedByProfile
          ).length,

          bountiesFundedButNotCreated:
            bountiesData.filter(
              (bounty) =>
                bounty.relationship.fundedByProfile &&
                !bounty.relationship.createdByProfile
            ).length,

          activeBounties: bountiesData.filter(
            (bounty) =>
              bounty.status === 'in_progress'
          ).length,

          completedBounties: bountiesData.filter(
            (bounty) =>
              bounty.status === 'completed'
          ).length,

          canceledBounties: bountiesData.filter(
            (bounty) =>
              bounty.status === 'canceled'
          ).length,

          claimsSubmitted: claimsData.length,
          claimsWon,
          claimsPending,
          claimsNotSelected,
          claimsOnCanceledBounties,

          nftsHeld: nftsData.length,
          commentsAuthored: commentsData.length,
          relatedUsers: relatedUsers.length,
        },

        totals:
          stats !== null
            ? {
                eth: {
                  paid: stats.eth.totalPaid,
                  earned: stats.eth.totalEarn,
                  inContract:
                    stats.eth.amountInContract,
                },

                degen: {
                  paid: stats.degen.totalPaid,
                  earned: stats.degen.totalEarn,
                  inContract:
                    stats.degen.amountInContract,
                },
              }
            : null,

        bounties: bountiesData,
        claims: claimsData,
        nfts: nftsData,
        comments: commentsData,

        /*
         * Direct crawl targets for the user's public social graph.
         * Each identity also contains profileUrl + profileDataUrl inline.
         */
        relatedUsers,
      },
      {
        headers: {
          ...CORS_HEADERS,
          ...CACHE_HEADERS,
        },
      }
    );
  } catch (error) {
    console.error('account data route error:', error);

    return NextResponse.json(
      { error: 'unable to load profile' },
      {
        status: 500,
        headers: CORS_HEADERS,
      }
    );
  }
}
