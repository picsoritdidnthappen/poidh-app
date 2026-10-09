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

/*
 * Known poidh protocol contracts.
 *
 * These may legitimately appear as claim NFT owners, but they should
 * never be represented as social users or included in relatedUsers.
 */
const POIDH_PROTOCOL_CONTRACTS = new Map<string, string>([
  [
    '0xe731dfadbf20542e10d09d26fc71445c70d4232',
    'poidh v3 core contract',
  ],
  [
    '0x5555fa783936c260f77385b4e153b9725fef1719',
    'poidh v3 core contract',
  ],
  [
    '0x9c5f45d5e1382e4058d334d93c6c01442012a4d9',
    'poidh claim NFT contract',
  ],
  [
    '0x27e117cc9a8da363442e7bd0618939e3eeeacf6a',
    'poidh claim NFT contract',
  ],
  [
    '0x18e5585ca7ce31b90bc8bb7aaf84152857ce243f',
    'historical poidh Degen core contract',
  ],
  [
    '0x39f04b7897dcaf9dc454e433f43fb1c3bb528e11',
    'historical poidh Degen claim NFT contract',
  ],
]);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=30, stale-while-revalidate=300',
};

/*
 * Compact representation used when a bounty is nested inside:
 *
 * - claims
 * - NFTs
 * - comments
 *
 * Intentionally does NOT fetch the full bounty description.
 */
const bountyReferenceSelect = {
  id: true,
  onChainId: true,
  chainId: true,
  title: true,
  issuer: true,
  inProgress: true,
  isCanceled: true,
  isVoting: true,

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

  /*
   * Needed to distinguish an unresolved voting round from one that
   * has already received its resolution transaction.
   */
  transactions: {
    select: {
      action: true,
      tx: true,
      timestamp: true,
    },
    orderBy: {
      timestamp: 'desc' as const,
    },
  },
} as const;

/*
 * Full bounty representation used only for bounties the profile
 * created or funded.
 *
 * This is the only place where full bounty descriptions are fetched.
 */
const fullBountySelect = {
  ...bountyReferenceSelect,

  description: true,
  amount: true,
  createdAt: true,
  isJoinedBounty: true,
  isMultiplayer: true,
  deadline: true,

  extra: {
    select: {
      album: true,
      amountSort: true,
    },
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

  /*
   * Claims do not currently have their own createdAt column.
   *
   * The earliest indexed transaction associated with the claim is
   * used as its best available chronological timestamp.
   */
  transactions: {
    orderBy: {
      timestamp: 'asc' as const,
    },
    take: 1,
    select: {
      tx: true,
      action: true,
      timestamp: true,
    },
  },

  bounty: {
    select: bountyReferenceSelect,
  },
} as const;

type BountyReference = {
  id: number;
  onChainId: number;
  chainId: number;
  title: string;
  issuer: string;
  inProgress: boolean;
  isCanceled: boolean;
  isVoting: boolean;

  claims: {
    id: number;
    onChainId: number;
    chainId: number;
    title: string;
    issuer: string;
  }[];

  transactions: {
    action: string;
    tx: string;
    timestamp: {
      toString(): string;
    };
  }[];
};

function getProtocolContractLabel(address: string) {
  return POIDH_PROTOCOL_CONTRACTS.get(address.toLowerCase()) ?? null;
}

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

    /*
     * This describes whether this record belongs to a currently
     * supported live protocol/network combination.
     *
     * The bounty's own status still determines whether the bounty
     * itself is actionable.
     */
    liveProtocolSupported:
      networkStatus === 'active' && protocolVersion === 'v3',
  };
}

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

/*
 * Determine whether the CURRENT voting round has been resolved.
 *
 * This matters because the indexed bounty.isVoting flag can remain
 * true after resolution.
 *
 * A previous resolved voting round must not cause a newer round to be
 * marked resolved, so we compare the most recent "submitted for vote"
 * transaction against the most recent resolution transaction.
 */
function getVotingState(bounty: BountyReference) {
  const latestVoteStart = bounty.transactions.find((transaction) =>
    isVoteStartAction(transaction.action)
  );

  const latestVoteResolution = bounty.transactions.find((transaction) =>
    isVoteResolutionAction(transaction.action)
  );

  let voteResolved = false;

  if (latestVoteStart && latestVoteResolution) {
    try {
      voteResolved =
        BigInt(latestVoteResolution.timestamp.toString()) >=
        BigInt(latestVoteStart.timestamp.toString());
    } catch {
      voteResolved =
        Number(latestVoteResolution.timestamp.toString()) >=
        Number(latestVoteStart.timestamp.toString());
    }
  }

  /*
   * An unresolved vote remains "in progress" even if its deadline
   * has already passed. It stops being in progress once the vote is
   * actually resolved.
   */
  const votingInProgress =
    bounty.isVoting && !voteResolved && !bounty.isCanceled;

  return {
    votingInProgress,
    voteResolved,

    voteStartedAt: latestVoteStart
      ? latestVoteStart.timestamp.toString()
      : null,

    voteResolution: voteResolved && latestVoteResolution
      ? {
          tx: latestVoteResolution.tx,
          action: latestVoteResolution.action,
          timestamp: latestVoteResolution.timestamp.toString(),
        }
      : null,
  };
}

function getBountyStatus(
  bounty: {
    isCanceled: boolean;
    inProgress: boolean;
  },
  votingInProgress: boolean
) {
  if (bounty.isCanceled) {
    return {
      status: 'canceled' as const,
      statusLabel: 'canceled',
      statusEmoji: '❌',
      acceptingClaims: false,
    };
  }

  if (!bounty.inProgress) {
    return {
      status: 'completed' as const,
      statusLabel: 'completed',
      statusEmoji: '✅',
      acceptingClaims: false,
    };
  }

  return {
    status: 'in_progress' as const,
    statusLabel: 'in progress',
    statusEmoji: '💰',
    acceptingClaims: !votingInProgress,
  };
}

function getClaimStatus(
  claim: {
    isAccepted: boolean;
  },
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
      {
        status: 400,
        headers: CORS_HEADERS,
      }
    );
  }

  const address = params.address.toLowerCase();

  try {
    const queryClient = getQueryClient();

    /*
     * Aggregate profile stats are useful, but they should not prevent
     * the historical profile endpoint from loading if price/stat
     * resolution temporarily fails.
     */
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

      /*
       * Every public bounty created by this wallet.
       *
       * Full descriptions are intentionally included here.
       */
      prisma.bounties.findMany({
        where: {
          issuer: address,
          ban: {
            none: {},
          },
        },
        select: fullBountySelect,
      }),

      /*
       * Every public bounty this wallet contributed funds to.
       *
       * Full descriptions are intentionally included here.
       */
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
            select: fullBountySelect,
          },
        },
      }),

      /*
       * Every public claim submitted by this wallet.
       *
       * The nested bounty is intentionally compact and does not
       * include the bounty description.
       */
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

      /*
       * Every public claim NFT currently held by this wallet.
       *
       * This is current ownership, not complete transfer history.
       */
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

      /*
       * Every public, non-deleted comment authored by this wallet.
       *
       * The nested bounty is intentionally compact.
       */
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
            select: bountyReferenceSelect,
          },
        },

        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    /*
     * Resolve visible parent comments so an agent can understand
     * who this user was replying to.
     *
     * Deleted comments remain excluded.
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
     * Gather every identity referenced by this profile.
     *
     * This creates enough context for agents to crawl outward through
     * poidh's public social graph.
     */
    const identityAddresses: string[] = [address];

    const addBountyIdentities = (bounty: BountyReference) => {
      identityAddresses.push(bounty.issuer.toLowerCase());

      const winningClaim = bounty.claims[0];

      if (winningClaim) {
        identityAddresses.push(winningClaim.issuer.toLowerCase());
      }
    };

    createdBounties.forEach((bounty) => {
      addBountyIdentities(bounty);
    });

    fundedParticipations.forEach((participation) => {
      addBountyIdentities(participation.bounty);
    });

    submittedClaims.forEach((claim) => {
      identityAddresses.push(claim.owner.toLowerCase());
      addBountyIdentities(claim.bounty);
    });

    ownedNfts.forEach((claim) => {
      identityAddresses.push(claim.issuer.toLowerCase());
      identityAddresses.push(claim.owner.toLowerCase());
      addBountyIdentities(claim.bounty);
    });

    authoredComments.forEach((comment) => {
      addBountyIdentities(comment.bounty);
    });

    parentComments.forEach((comment) => {
      identityAddresses.push(comment.userAddress.toLowerCase());
    });

    const uniqueAddresses = [
      ...new Set(identityAddresses.map((item) => item.toLowerCase())),
    ];

    /*
     * Do not waste ENS/Neynar lookups on known poidh protocol
     * contracts.
     */
    const resolvableAddresses = uniqueAddresses.filter(
      (userAddress) => !getProtocolContractLabel(userAddress)
    );

    /*
     * Social identity resolution is enrichment.
     *
     * If it fails, the core historical/account data should still load.
     */
    const [neynarUsers, names] = await Promise.all([
      getUsersDataOrFetchItFromNeynar(resolvableAddresses).catch(() => []),

      Promise.all(
        resolvableAddresses.map(async (userAddress) => {
          try {
            return await getHumanReadableName(userAddress);
          } catch {
            return null;
          }
        })
      ),
    ]);

    const nameByAddress = new Map(
      resolvableAddresses.map((userAddress, index) => [
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

      const protocolContractLabel =
        getProtocolContractLabel(normalized);

      if (protocolContractLabel) {
        return {
          address: normalized,

          accountType: 'protocol_contract' as const,
          isProtocolContract: true,
          contractLabel: protocolContractLabel,

          name: null,
          farcasterHandle: null,
          twitterHandle: null,
          pfpUrl: null,

          /*
           * Contracts are not social profiles and should not be
           * crawl targets.
           */
          profileUrl: null,
          profileDataUrl: null,
        };
      }

      const neynarUser = neynarByAddress.get(normalized);

      return {
        address: normalized,

        accountType: 'user' as const,
        isProtocolContract: false,
        contractLabel: null,

        name: nameByAddress.get(normalized) ?? null,
        farcasterHandle: neynarUser?.farcasterTag ?? null,
        twitterHandle: neynarUser?.twitterTag ?? null,
        pfpUrl: neynarUser?.pfpUrl ?? null,

        profileUrl: `${APP_URL}/account/${normalized}`,
        profileDataUrl: `${APP_URL}/account/${normalized}/data`,
      };
    };

    /*
     * Compact bounty object used everywhere except the top-level
     * bounties array.
     *
     * No bounty description is returned from here.
     */
    const buildBountyReference = (bounty: BountyReference) => {
      const urls = getBountyUrls(
        bounty.chainId,
        bounty.id
      );

      const voting = getVotingState(bounty);

      const status = getBountyStatus(
        bounty,
        voting.votingInProgress
      );

      const network = getNetworkInfo(
        bounty.chainId,
        bounty.id
      );

      const winningClaim =
        bounty.claims[0] ?? null;

      return {
        bountyId: bounty.id,
        onChainId: bounty.onChainId,

        chainId: bounty.chainId,
        chain: CHAIN_SLUGS[bounty.chainId] ?? null,
        currency:
          CHAIN_CURRENCIES[bounty.chainId] ?? null,

        ...network,

        title: bounty.title,

        ...status,

        /*
         * These are derived current-state fields.
         *
         * Do not expose the stale indexed isVoting flag as if it were
         * current voting state.
         */
        votingInProgress:
          voting.votingInProgress,

        voteResolved:
          voting.voteResolved,

        voteStartedAt:
          voting.voteStartedAt,

        voteResolution:
          voting.voteResolution,

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

              /*
               * The bounty winner is the accepted claim issuer,
               * regardless of who currently owns the claim NFT.
               */
              winner: getIdentity(
                winningClaim.issuer
              ),
            }
          : null,
      };
    };

    /*
     * Merge bounties created by this user with bounties they funded.
     *
     * Preserve both relationships where both apply.
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
      bountyMap.set(
        `${bounty.chainId}-${bounty.id}`,
        {
          bounty,
          createdByProfile: true,
          fundedByProfile: false,
          contributionAmount: null,
        }
      );
    }

    for (const participation of fundedParticipations) {
      const bounty = participation.bounty;
      const key = `${bounty.chainId}-${bounty.id}`;

      const existing = bountyMap.get(key);

      if (existing) {
        existing.fundedByProfile = true;
        existing.contributionAmount =
          participation.amount;
      } else {
        bountyMap.set(key, {
          bounty,
          createdByProfile: false,
          fundedByProfile: true,
          contributionAmount:
            participation.amount,
        });
      }
    }

    /*
     * This is the only bounty collection containing full descriptions.
     */
    const bountiesData = Array.from(
      bountyMap.values()
    )
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

            /*
             * Full description belongs here because this bounty is
             * directly part of the user's economic history.
             */
            description: bounty.description,

            amount: bounty.amount,
            amountFormatted:
              formatAmount(bounty.amount),

            priceUsd:
              bounty.extra.amountSort,

            createdAt:
              bounty.createdAt.toString(),

            deadline: bounty.deadline,

            isMultiplayer:
              bounty.isMultiplayer,

            isJoinedBounty:
              bounty.isJoinedBounty,

            album:
              bounty.extra.album,

            relationship: {
              createdByProfile,
              fundedByProfile,

              contributionAmount,

              contributionAmountFormatted:
                formatAmount(
                  contributionAmount
                ),
            },
          };
        }
      );

    /*
     * Claims submitted by this user.
     *
     * The associated bounty is compact: title/status/creator/winner/
     * URLs only, with no full bounty description.
     */
    const claimsData = submittedClaims
      .map((claim) => {
        const createdTransaction =
          claim.transactions[0] ?? null;

        return {
          claimId: claim.id,
          onChainId: claim.onChainId,

          chainId: claim.chainId,
          chain:
            CHAIN_SLUGS[claim.chainId] ?? null,

          title: claim.title,
          description: claim.description,
          proofUri: claim.url,

          createdAt:
            createdTransaction?.timestamp.toString() ??
            null,

          creationTx:
            createdTransaction?.tx ?? null,

          isAccepted:
            claim.isAccepted,

          claimStatus: getClaimStatus(
            claim,
            claim.bounty
          ),

          /*
           * A submitted claim NFT may still be held by the poidh
           * protocol contract. In that case this is labeled as a
           * protocol contract rather than represented as a user.
           */
          currentOwner:
            getIdentity(claim.owner),

          bounty:
            buildBountyReference(
              claim.bounty
            ),
        };
      })
      .sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return (
            Number(b.createdAt) -
            Number(a.createdAt)
          );
        }

        return b.claimId - a.claimId;
      });

    /*
     * Claim NFTs currently owned by this account.
     *
     * This is a current collection, not a historical transfer ledger.
     */
    const nftsData = ownedNfts
      .map((claim) => {
        const createdTransaction =
          claim.transactions[0] ?? null;

        return {
          claimId: claim.id,
          onChainId: claim.onChainId,

          chainId: claim.chainId,
          chain:
            CHAIN_SLUGS[claim.chainId] ?? null,

          title: claim.title,
          description: claim.description,
          proofUri: claim.url,

          createdAt:
            createdTransaction?.timestamp.toString() ??
            null,

          isAccepted:
            claim.isAccepted,

          claimStatus:
            getClaimStatus(
              claim,
              claim.bounty
            ),

          currentOwner:
            getIdentity(claim.owner),

          /*
           * The NFT holder may not be the person who originally
           * submitted the claim.
           */
          originalClaimant:
            getIdentity(claim.issuer),

          bounty:
            buildBountyReference(
              claim.bounty
            ),
        };
      })
      .sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return (
            Number(b.createdAt) -
            Number(a.createdAt)
          );
        }

        return b.claimId - a.claimId;
      });

    /*
     * Public comment history authored by this profile.
     */
    const commentsData =
      authoredComments.map((comment) => {
        const parent =
          comment.parentId !== null
            ? parentCommentById.get(
                comment.parentId
              ) ?? null
            : null;

        const reactions =
          getReactionCounts(
            comment.reactions
          );

        return {
          commentId: comment.id,
          parentId: comment.parentId,

          body: comment.body,

          createdAt:
            comment.createdAt.toISOString(),

          upvotes:
            reactions.upvotes,

          downvotes:
            reactions.downvotes,

          replyTo: parent
            ? {
                commentId: parent.id,
                body: parent.body,
                author: getIdentity(
                  parent.userAddress
                ),
              }
            : null,

          /*
           * Compact bounty reference only.
           */
          bounty:
            buildBountyReference(
              comment.bounty
            ),
        };
      });

    /*
     * Build an explicit social graph so agents do not need to parse
     * every nested object just to discover related accounts.
     *
     * Protocol contracts are deliberately excluded.
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
      /*
       * Don't link the profile back to itself.
       */
      if (user.address === address) {
        return;
      }

      /*
       * Protocol contracts can appear as custodians/owners, but they
       * are not members of the poidh social graph.
       */
      if (user.isProtocolContract) {
        return;
      }

      const existing =
        relatedUsersMap.get(user.address);

      if (existing) {
        existing.relationships.add(
          relationship
        );

        if (bountyUrl) {
          existing.bountyUrls.add(
            bountyUrl
          );
        }

        return;
      }

      relatedUsersMap.set(
        user.address,
        {
          user,
          relationships:
            new Set([relationship]),

          bountyUrls: new Set(
            bountyUrl
              ? [bountyUrl]
              : []
          ),
        }
      );
    };

    /*
     * People connected through bounties this profile created/funded.
     */
    bountiesData.forEach((bounty) => {
      if (
        bounty.relationship
          .fundedByProfile &&
        !bounty.relationship
          .createdByProfile
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

    /*
     * People connected through claims submitted by this profile.
     */
    claimsData.forEach((claim) => {
      addRelatedUser(
        claim.bounty.creator,
        'created_bounty_profile_claimed',
        claim.bounty.url
      );

      if (
        claim.bounty.winningClaim
      ) {
        addRelatedUser(
          claim.bounty.winningClaim
            .winner,
          'won_bounty_profile_claimed',
          claim.bounty.url
        );
      }

      /*
       * This only becomes a social relationship if the current owner
       * is a real user. Protocol contracts are filtered automatically.
       */
      addRelatedUser(
        claim.currentOwner,
        'current_owner_of_profile_submitted_claim_nft',
        claim.bounty.url
      );
    });

    /*
     * People connected through NFTs currently held by this profile.
     */
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

      if (
        nft.bounty.winningClaim
      ) {
        addRelatedUser(
          nft.bounty.winningClaim
            .winner,
          'won_bounty_for_profile_held_nft',
          nft.bounty.url
        );
      }
    });

    /*
     * People connected through comments/replies.
     */
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
    ).map(
      ({
        user,
        relationships,
        bountyUrls,
      }) => ({
        ...user,

        relationships:
          Array.from(relationships),

        relatedBountyUrls:
          Array.from(bountyUrls),
      })
    );

    const claimsWon =
      claimsData.filter(
        (claim) =>
          claim.claimStatus === 'won'
      ).length;

    const claimsPending =
      claimsData.filter(
        (claim) =>
          claim.claimStatus === 'pending'
      ).length;

    const claimsNotSelected =
      claimsData.filter(
        (claim) =>
          claim.claimStatus ===
          'not_selected'
      ).length;

    const claimsOnCanceledBounties =
      claimsData.filter(
        (claim) =>
          claim.claimStatus ===
          'bounty_canceled'
      ).length;

    return NextResponse.json(
      {
        address,

        profile:
          getIdentity(address),

        profileUrl:
          `${APP_URL}/account/${address}`,

        dataUrl:
          `${APP_URL}/account/${address}/data`,

        skillUrl:
          `${APP_URL}/skill.md`,

        docsUrl: 
          `https://docs.poidh.xyz/`,
        
        githubUrl: 
          `https://github.com/picsoritdidnthappen/poidh-app`,

        poidhScore:
          stats !== null
            ? Number(stats.poidhScore)
            : null,

        summary: {
          bounties:
            bountiesData.length,

          bountiesCreated:
            bountiesData.filter(
              (bounty) =>
                bounty.relationship
                  .createdByProfile
            ).length,

          bountiesFunded:
            bountiesData.filter(
              (bounty) =>
                bounty.relationship
                  .fundedByProfile
            ).length,

          bountiesFundedButNotCreated:
            bountiesData.filter(
              (bounty) =>
                bounty.relationship
                  .fundedByProfile &&
                !bounty.relationship
                  .createdByProfile
            ).length,

          activeBounties:
            bountiesData.filter(
              (bounty) =>
                bounty.status ===
                'in_progress'
            ).length,

          completedBounties:
            bountiesData.filter(
              (bounty) =>
                bounty.status ===
                'completed'
            ).length,

          canceledBounties:
            bountiesData.filter(
              (bounty) =>
                bounty.status ===
                'canceled'
            ).length,

          claimsSubmitted:
            claimsData.length,

          claimsWon,

          claimsPending,

          claimsNotSelected,

          claimsOnCanceledBounties,

          nftsHeld:
            nftsData.length,

          commentsAuthored:
            commentsData.length,

          relatedUsers:
            relatedUsers.length,
        },

        totals:
          stats !== null
            ? {
                eth: {
                  paid:
                    stats.eth.totalPaid,

                  earned:
                    stats.eth.totalEarn,

                  inContract:
                    stats.eth
                      .amountInContract,
                },

                /*
                 * Historical Degen activity remains part of the
                 * profile's historical record.
                 */
                degen: {
                  paid:
                    stats.degen.totalPaid,

                  earned:
                    stats.degen.totalEarn,

                  inContract:
                    stats.degen
                      .amountInContract,
                },
              }
            : null,

        /*
         * Full descriptions appear ONLY in this array.
         */
        bounties: bountiesData,

        /*
         * All nested bounty objects below are compact references.
         */
        claims: claimsData,
        nfts: nftsData,
        comments: commentsData,

        /*
         * Direct crawl targets for the public poidh social graph.
         *
         * Every real user here has profileUrl + profileDataUrl.
         * Known poidh protocol contracts are excluded.
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
    console.error(
      'account data route error:',
      error
    );

    return NextResponse.json(
      {
        error: 'unable to load profile',
      },
      {
        status: 500,
        headers: CORS_HEADERS,
      }
    );
  }
}
