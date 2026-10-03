import { PieChart } from 'react-minimal-pie-chart';
import { toast } from 'react-toastify';
import { toastError } from '@/utils/errors';
import { formatEther } from 'viem';
import { useChainInfo } from '@/hooks/useChainInfo';
import { useAccount, useSwitchChain, useWriteContract } from 'wagmi';
import abi from '@/constant/abi/abi';
import { useMutation } from '@tanstack/react-query';
import { trpc, trpcClient } from '@/trpc/client';
import { useSetAtom } from 'jotai';
import { pollingChainIdAtom, setLoadingAtom } from '@/store/loading';
import { Claim } from '@/utils/types';
import { useMemo, useState } from 'react';
import ConfirmBountySuccessModal from './ConfirmBountySuccessModal';

function formatDeadline(date: Date) {
  return date.toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function Voting({
  bountyId,
  isAcceptedBounty,
  votingClaim,
}: {
  bountyId: number;
  isAcceptedBounty: boolean;
  votingClaim?: Claim | null;
}) {
  const account = useAccount();
  const chain = useChainInfo();
  const writeContract = useWriteContract();
  const switchChain = useSwitchChain();

  const setLoading = useSetAtom(setLoadingAtom);

  const setPollingChainId = useSetAtom(pollingChainIdAtom);

  const [showConfirmSuccess, setShowConfirmSuccess] = useState(false);

  const voting = trpc.bounties.fetchVoting.useQuery({
    bountyId,
    chainId: chain.id,
  });

  const bounty = trpc.bounties.fetch.useQuery({
    id: Number(bountyId),
    chainId: chain.id,
  });

  const userCanVote = trpc.accounts.canVote.useQuery(
    {
      address: account.address?.toLowerCase() ?? '',
      bountyId: Number(bountyId),
      chainId: chain.id,
      currentRound: voting.data?.round ?? 1,
    },
    {
      enabled: !!account.address && voting.isSuccess,
    }
  );

  const bountyContributors = trpc.bounties.participations.useQuery({
    chainId: chain.id,
    bountyId: Number(bountyId),
  });

  const isBountyOwner =
    account.address?.toLowerCase() === bounty.data?.issuer?.toLowerCase();

  const isBountyContributor = bountyContributors.data?.some(
    (contributor: { userAddress: string }) =>
      contributor.userAddress.toLowerCase() === account.address?.toLowerCase()
  );

  const deadlineMs = (bounty.data?.deadline ?? 0) * 1000;

  const isVotingInProgress = deadlineMs > Date.now();

  const canResolveVote =
    !!bounty.data &&
    bounty.data.inProgress &&
    bounty.data.isVoting &&
    !isAcceptedBounty &&
    deadlineMs > 0 &&
    !isVotingInProgress;

  const canVote =
    isVotingInProgress &&
    !!isBountyContributor &&
    !!userCanVote.data &&
    !isBountyOwner &&
    !isAcceptedBounty;

  const yesWei = BigInt(voting.data?.yes ?? 0);

  const noWei = BigInt(voting.data?.no ?? 0);

  const bountyAmountWei = BigInt(bounty.data?.amount ?? 0);

  const abstainWei = useMemo(() => {
    const used = yesWei + noWei;

    return bountyAmountWei > used ? bountyAmountWei - used : BigInt(0);
  }, [bountyAmountWei, yesWei, noWei]);

  const refreshAll = async () => {
    await Promise.all([
      voting.refetch(),
      bounty.refetch(),
      ...(account.address ? [userCanVote.refetch()] : []),
    ]);
  };

  const ensureCorrectChain = async () => {
    const currentChainId = await account.connector?.getChainId();

    if (currentChainId !== chain.id) {
      setLoading({
        isLoading: true,
        status: 'Switching network',
      });

      await switchChain.switchChainAsync({
        chainId: chain.id,
      });
    }
  };

  /*
   * Wait until the indexer has recorded
   * the user's vote.
   *
   * accounts.canVote becomes false once
   * the indexed "voted" transaction exists.
   */
  const waitForVoteIndexing = async (currentRound: number) => {
    if (!account.address) {
      return false;
    }

    for (let i = 0; i < 60; i++) {
      setLoading({
        isLoading: true,
        status: `Indexing vote... ${i}s`,
      });

      const canStillVote = await trpcClient.accounts.canVote.query({
        address: account.address.toLowerCase(),
        bountyId: Number(bountyId),
        chainId: chain.id,
        currentRound,
      });

      if (!canStillVote) {
        return true;
      }

      await sleep(1000);
    }

    return false;
  };

  /*
   * Wait until the indexer reflects
   * that voting has ended.
   */
  const waitForResolveIndexing = async () => {
    for (let i = 0; i < 60; i++) {
      setLoading({
        isLoading: true,
        status: `Indexing result... ${i}s`,
      });

      const latestBounty = await trpcClient.bounties.fetch.query({
        id: Number(bountyId),
        chainId: chain.id,
      });

      if (!latestBounty.isVoting) {
        return true;
      }

      await sleep(1000);
    }

    return false;
  };

  const voteMutation = useMutation({
    mutationFn: async ({ vote }: { vote: boolean }) => {
      if (!bounty.data) {
        throw new Error('Bounty not found');
      }

      if (!account.address) {
        throw new Error('Wallet not connected');
      }

      if (!canVote) {
        throw new Error('You cannot vote on this bounty');
      }

      await ensureCorrectChain();

      setPollingChainId(chain.id);

      setLoading({
        isLoading: true,
        status: 'Waiting for approval',
      });

      const tx = await writeContract.writeContractAsync({
        abi,
        address: chain.contracts.mainContract as `0x${string}`,
        functionName: 'voteClaim',
        args: [BigInt(bounty.data.onChainId), vote],
        chainId: chain.id,
      });

      setLoading({
        isLoading: true,
        status: 'Waiting for confirmation...',
      });

      await chain.provider.waitForTransactionReceipt({
        hash: tx,
      });

      const currentRound = voting.data?.round ?? 1;

      const indexed = await waitForVoteIndexing(currentRound);

      return {
        indexed,
      };
    },

    onSuccess: async ({ indexed }) => {
      /*
       * Only refresh after we've given
       * the indexer time to catch up.
       */
      await refreshAll();

      if (indexed) {
        toast.success('Voted successfully');
      } else {
        toast.info('Vote confirmed. Indexing is taking longer than expected.');
      }
    },

    onError: (error) => {
      toastError('Failed to vote', error);
    },

    onSettled: () => {
      setPollingChainId(null);

      setLoading({
        isLoading: false,
        status: '',
      });
    },
  });

  const resolveVoteMutation = useMutation({
    mutationFn: async () => {
      if (!bounty.data) {
        throw new Error('Bounty data not found');
      }

      if (!account.address) {
        throw new Error('Wallet not connected');
      }

      if (
        !bounty.data.inProgress ||
        !bounty.data.isVoting ||
        isAcceptedBounty ||
        deadlineMs <= 0 ||
        deadlineMs > Date.now()
      ) {
        throw new Error('This vote is not ready to resolve');
      }

      await ensureCorrectChain();

      setPollingChainId(chain.id);

      setLoading({
        isLoading: true,
        status: 'Waiting for approval',
      });

      const tx = await writeContract.writeContractAsync({
        abi,
        address: chain.contracts.mainContract as `0x${string}`,
        functionName: 'resolveVote',
        args: [BigInt(bounty.data.onChainId)],
        chainId: chain.id,
      });

      setLoading({
        isLoading: true,
        status: 'Waiting for confirmation...',
      });

      await chain.provider.waitForTransactionReceipt({
        hash: tx,
      });

      const indexed = await waitForResolveIndexing();

      return {
        indexed,
      };
    },

    onSuccess: async ({ indexed }) => {
      await refreshAll();

      if (isBountyOwner && votingClaim) {
        setShowConfirmSuccess(true);
      } else if (indexed) {
        toast.success('Vote resolved successfully');
      } else {
        toast.info(
          'Vote resolved onchain. Indexing is taking longer than expected.'
        );
      }
    },

    onError: (error) => {
      toastError('Failed to resolve vote', error);
    },

    onSettled: () => {
      setPollingChainId(null);

      setLoading({
        isLoading: false,
        status: '',
      });
    },
  });

  const isInitialLoading = voting.isLoading || bounty.isLoading;

  if (isInitialLoading) {
    return (
      <div className='w-full mt-5 animate-pulse'>
        <div className='bg-gradient-to-br from-white/5 via-white/10 to-white/5 rounded-2xl border border-white/20 p-6 backdrop-blur-md'>
          <div className='space-y-2'>
            <div className='flex justify-center items-center h-7'>
              <div className='h-5 w-40 rounded bg-white/10' />
            </div>

            <div className='flex justify-center'>
              <div className='w-full aspect-square p-[10%]'>
                <div className='w-full h-full rounded-full bg-white/10' />
              </div>
            </div>

            <div className='space-y-2 bg-white/5 rounded-lg p-3 border border-white/10'>
              <div className='h-6' />
              <div className='h-6' />
            </div>

            {!isAcceptedBounty && (
              <div className='bg-white/5 rounded-lg p-3 border border-white/10'>
                <div className='h-4' />
                <div className='h-4 mt-1' />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!voting.data || !bounty.data) {
    return (
      <div className='flex items-center justify-center h-40 bg-gradient-to-br from-white/5 via-white/10 to-white/5 rounded-2xl border border-white/20 backdrop-blur-md'>
        <p className='text-sm text-white/50'>Voting data unavailable.</p>
      </div>
    );
  }

  return (
    <div className='w-full mt-5'>
      <div className='bg-gradient-to-br from-white/5 via-white/10 to-white/5 rounded-2xl border border-white/20 p-6 backdrop-blur-md shadow-2xl'>
        <div className='space-y-2'>
          <div className='text-center'>
            <h3 className='text-lg font-family-pixeloid bg-gradient-to-r text-poidhRed bg-clip-text [text-shadow:-0.5px_-0.5px_0_white,0.5px_-0.5px_0_white,-0.5px_0.5px_0_white,0.5px_0.5px_0_white]'>
              {isAcceptedBounty
                ? 'Voting resolved'
                : isVotingInProgress
                ? 'Voting in progress'
                : 'Voting closed'}
            </h3>
          </div>

          <div className='flex justify-center'>
            <PieChart
              data={[
                {
                  value: Number(formatEther(yesWei)),
                  title: 'Yes',
                  color: '#2A81D5',
                },
                {
                  value: Number(formatEther(noWei)),
                  title: 'No',
                  color: '#F15E5F',
                },
                {
                  value: Number(formatEther(abstainWei)),
                  title: 'Abstain',
                  color: '#5A5A5A',
                },
              ]}
              labelPosition={50}
              radius={40}
              label={({ dataEntry, x, y, dx, dy }) =>
                !dataEntry.value ? (
                  ''
                ) : (
                  <text
                    x={x}
                    y={y}
                    dx={dx}
                    dy={dy}
                    textAnchor='middle'
                    dominantBaseline='central'
                    fill='#FFF'
                    style={{
                      fontSize: '4px',
                      fontWeight: 600,
                      pointerEvents: 'none',
                    }}
                  >
                    <tspan
                      x={x}
                      y={y}
                      dx={dataEntry.percentage === 100 ? 0 : dx}
                      dy={dataEntry.percentage === 100 ? 0 : dy}
                    >
                      {Math.round(dataEntry.percentage)}%
                    </tspan>

                    <tspan
                      x={x}
                      y={y + 3.5}
                      dx={dataEntry.percentage === 100 ? 0 : dx}
                      dy={dataEntry.percentage === 100 ? 0 : dy}
                    >
                      {dataEntry.title}
                    </tspan>
                  </text>
                )
              }
              labelStyle={() => ({
                fontSize: '4px',
                fontWeight: 'bold',
              })}
              animate
            />
          </div>

          <div className='space-y-2 bg-white/5 rounded-lg p-3 border border-white/10'>
            <div className='flex items-center justify-between'>
              <span className='text-sm text-white/70'>Yes votes</span>

              <span className='font-semibold'>
                {formatEther(yesWei)} {chain.currency}
              </span>
            </div>

            <div className='flex items-center justify-between'>
              <span className='text-sm text-white/70'>No votes</span>

              <span className='font-semibold'>
                {formatEther(noWei)} {chain.currency}
              </span>
            </div>
          </div>

          {canVote && (
            <div className='space-y-3'>
              <p className='text-center text-sm font-medium text-white/80'>
                What is your vote?
              </p>

              <div className='flex gap-3'>
                <button
                  className='flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-200 border border-blue-400/20 bg-gradient-to-r from-blue-500/70 to-blue-600/70 text-white hover:from-blue-500/85 hover:to-blue-600/85 hover:border-blue-400 active:scale-95 shadow-lg hover:shadow-blue-500/20'
                  onClick={() =>
                    voteMutation.mutate({
                      vote: true,
                    })
                  }
                  disabled={voteMutation.isPending}
                >
                  {voteMutation.isPending ? 'Voting...' : 'Yes'}
                </button>

                <button
                  className='flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-200 border border-red-400/50 bg-gradient-to-r from-red-500/70 to-red-600/70 text-white hover:from-red-500/85 hover:to-red-600/85 hover:border-red-400 active:scale-95 shadow-lg hover:shadow-red-500/20'
                  onClick={() =>
                    voteMutation.mutate({
                      vote: false,
                    })
                  }
                  disabled={voteMutation.isPending}
                >
                  {voteMutation.isPending ? 'Voting...' : 'No'}
                </button>
              </div>
            </div>
          )}

          {(isBountyOwner ||
            (isBountyContributor && userCanVote.data === false)) &&
            !isAcceptedBounty && (
              <div className='p-4 rounded-lg border text-center'>
                <p className='text-sm font-medium'>
                  ✓ Thank you for your vote!
                </p>
              </div>
            )}

          {canResolveVote && (
            <button
              className='w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 border border-blue-400/20 bg-gradient-to-r from-blue-500/70 to-blue-600/70 text-white hover:from-blue-500/85 hover:to-blue-600/85 hover:border-blue-400 active:scale-95 shadow-lg hover:shadow-blue-500/20'
              onClick={() => resolveVoteMutation.mutate()}
              disabled={resolveVoteMutation.isPending}
            >
              {resolveVoteMutation.isPending ? 'Resolving...' : 'Resolve vote'}
            </button>
          )}

          {!isAcceptedBounty && (
            <div className='text-center text-xs text-white/60 bg-white/5 rounded-lg p-3 border border-white/10'>
              <p className='font-medium text-white/80'>Deadline</p>

              <p className='mt-1'>{formatDeadline(new Date(deadlineMs))}</p>
            </div>
          )}
        </div>
      </div>

      {bounty.data && votingClaim && (
        <ConfirmBountySuccessModal
          open={showConfirmSuccess}
          onClose={() => setShowConfirmSuccess(false)}
          claimImage={votingClaim.url ?? ''}
          claimTitle={votingClaim.title}
          claimIssuer={votingClaim.issuer}
          bountyTitle={bounty.data.title}
          bountyAmount={bounty.data.amount}
          bountyIssuer={bounty.data.issuer}
        />
      )}
    </div>
  );
}
