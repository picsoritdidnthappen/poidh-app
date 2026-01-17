import { PieChart } from 'react-minimal-pie-chart';
import { toast } from 'react-toastify';
import { formatEther } from 'viem';
import { useChainInfo } from '@/hooks/useGetChain';
import { bountyVotingTracker } from '@/utils/web3';
import { useAccount, useSwitchChain, useWriteContract } from 'wagmi';
import abi from '@/constant/abi/abi';
import { useMutation, useQuery } from '@tanstack/react-query';
import { trpc } from '@/trpc/client';
import { useSetAtom } from 'jotai';
import { pollingChainIdAtom, setLoadingAtom } from '@/store/loading';

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

export default function Voting({
  bountyId,
  isAcceptedBounty,
}: {
  bountyId: string;
  isAcceptedBounty: boolean;
}) {
  const account = useAccount();
  const chain = useChainInfo();
  const writeContract = useWriteContract({});
  const switctChain = useSwitchChain();
  const setLoading = useSetAtom(setLoadingAtom);
  const setPollingChainId = useSetAtom(pollingChainIdAtom);

  const voting = useQuery({
    queryKey: ['bountyVotingTracker', { id: bountyId, chainName: chain.slug }],
    queryFn: () => bountyVotingTracker({ id: bountyId, chainName: chain.slug }),
  });

  const bounty = trpc.bounties.fetch.useQuery({
    id: Number(bountyId),
    chainId: chain.id,
  });

  const userHasVoted = trpc.accounts.hasVoted.useQuery({
    address: account.address ?? '',
    bountyId: Number(bountyId),
    chainId: chain.id,
  });

  const bountyContibutors = trpc.bounties.participations.useQuery({
    chainId: chain.id,
    bountyId: Number(bountyId),
  });

  const isBountyContributor = bountyContibutors.data?.some(
    (contributor: { user_address: string }) =>
      contributor.user_address.toLowerCase() === account.address?.toLowerCase()
  );
  const isVotingInProgress =
    parseInt(voting.data?.deadline ?? '0') * 1000 > Date.now();

  const voteMutation = useMutation({
    mutationFn: async ({ vote }: { vote: boolean }) => {
      if (!bounty.data) {
        throw new Error('Bounty not found');
      }

      const chainId = await account.connector?.getChainId();
      if (chain.id !== chainId) {
        setLoading({ isLoading: true, status: 'Switching network' });
        await switctChain.switchChainAsync({ chainId: chain.id });
      }

      setPollingChainId(chain.id);
      setLoading({ isLoading: true, status: '' });
      await writeContract.writeContractAsync({
        abi,
        address: chain.contracts.mainContract as `0x${string}`,
        functionName: 'voteClaim',
        args: [BigInt(bounty.data.onChainId), vote],
        chainId: chain.id,
      });

      voting.refetch();
    },
    onSuccess: () => {
      toast.success('Voted successfully');
    },
    onError: (error) => {
      toast.error('Failed to vote: ' + error.message);
    },
    onSettled: () => {
      setLoading({ isLoading: false, status: '' });
      voting.refetch();
    },
  });

  const resolveVoteMutation = useMutation({
    mutationFn: async () => {
      if (!bounty.data) {
        throw new Error('Bounty data not found!');
      }

      const chainId = await account.connector?.getChainId();
      if (chain.id !== chainId) {
        await switctChain.switchChainAsync({ chainId: chain.id });
      }
      await writeContract.writeContractAsync({
        abi,
        address: chain.contracts.mainContract as `0x${string}`,
        functionName: 'resolveVote',
        args: [BigInt(bounty.data.onChainId)],
        chainId: chain.id,
      });
    },
    onSuccess: () => {
      toast.success('Vote resolved successfully');
    },
    onError: (error) => {
      toast.error('Failed to resolve vote: ' + error.message);
    },
    onSettled: () => {
      voting.refetch();
    },
  });

  return (
    <div className='w-full mt-5'>
      {voting.data ? (
        <div className='bg-gradient-to-br from-white/5 via-white/10 to-white/5 rounded-2xl border border-white/20 p-6 backdrop-blur-md shadow-2xl'>
          <div className='space-y-2'>
            <div className='text-center'>
              <h3 className='text-lg font-family-pixeloid bg-gradient-to-r text-poidhRed bg-clip-text [text-shadow:-0.5px_-0.5px_0_white,0.5px_-0.5px_0_white,-0.5px_0.5px_0_white,0.5px_0.5px_0_white]'>
                {isAcceptedBounty ? 'Voting closed' : 'Voting in progress'}
              </h3>
            </div>

            <div className='flex justify-center'>
              <PieChart
                data={[
                  {
                    value: Number(formatEther(BigInt(voting.data.yes || 0))),
                    title: 'Yes',
                    color: '#2A81D5',
                  },
                  {
                    value: Number(formatEther(BigInt(voting.data.no || 0))),
                    title: 'No',
                    color: '#F15E5F',
                  },
                  {
                    value: bounty.data
                      ? Number(formatEther(BigInt(bounty.data.amount || 0))) -
                        Number(formatEther(BigInt(voting.data.yes || 0))) -
                        Number(formatEther(BigInt(voting.data.no || 0)))
                      : 0,
                    title: 'Abstain',
                    color: '#5A5A5A',
                  },
                ]}
                labelPosition={50}
                radius={40}
                label={({ dataEntry, x, y, dx, dy }) => {
                  return !dataEntry.value ? (
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
                  );
                }}
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
                  {formatEther(BigInt(voting.data.yes || 0))} {chain.currency}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-white/70'>No votes</span>
                <span className='font-semibold'>
                  {formatEther(BigInt(voting.data.no || 0))} {chain.currency}
                </span>
              </div>
            </div>

            {isVotingInProgress &&
              isBountyContributor &&
              !userHasVoted.data && (
                <div className='space-y-3'>
                  <p className='text-center text-sm font-medium text-white/80'>
                    What is your vote?
                  </p>
                  <div className='flex gap-3'>
                    <button
                      className='flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-200 border border-blue-400/20 bg-gradient-to-r from-blue-500/70 to-blue-600/70 text-white hover:from-blue-500/85 hover:to-blue-600/85 hover:border-blue-400 active:scale-95 shadow-lg hover:shadow-blue-500/20'
                      onClick={() => {
                        if (account.address) {
                          voteMutation.mutate({
                            vote: true,
                          });
                        } else {
                          toast.error('Please connect wallet to continue');
                        }
                      }}
                      disabled={voteMutation.isPending}
                    >
                      {voteMutation.isPending ? 'Voting...' : 'Yes'}
                    </button>
                    <button
                      className='flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-200 border border-red-400/50 bg-gradient-to-r from-red-500/70 to-red-600/70 text-white hover:from-red-500/85 hover:to-red-600/85 hover:border-red-400 active:scale-95 shadow-lg hover:shadow-red-500/20'
                      onClick={() => {
                        if (account.address) {
                          voteMutation.mutate({
                            vote: false,
                          });
                        } else {
                          toast.error('Please connect wallet to continue');
                        }
                      }}
                      disabled={voteMutation.isPending}
                    >
                      {voteMutation.isPending ? 'Voting...' : 'No'}
                    </button>
                  </div>
                </div>
              )}

            {isVotingInProgress && isBountyContributor && userHasVoted.data && (
              <div className='p-4 rounded-lg border text-center'>
                <p className='text-sm font-medium'>
                  ✓ Thank you for your vote!
                </p>
              </div>
            )}

            {!isVotingInProgress && !isAcceptedBounty && (
              <button
                className='w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 border border-blue-400/20 bg-gradient-to-r from-blue-500/70 to-blue-600/70 text-white hover:from-blue-500/85 hover:to-blue-600/85 hover:border-blue-400 active:scale-95 shadow-lg hover:shadow-blue-500/20'
                onClick={() => {
                  if (account.address) {
                    resolveVoteMutation.mutate();
                  } else {
                    toast.error('Please connect wallet to continue');
                  }
                }}
                disabled={resolveVoteMutation.isPending}
              >
                {resolveVoteMutation.isPending
                  ? 'Resolving...'
                  : 'Resolve vote'}
              </button>
            )}

            {!isAcceptedBounty && (
              <div className='text-center text-xs text-white/60 bg-white/5 rounded-lg p-3 border border-white/10'>
                <p className='font-medium text-white/80'>Deadline</p>
                <p className='mt-1'>
                  {formatDeadline(
                    new Date(parseInt(voting.data.deadline ?? '0') * 1000)
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className='flex items-center justify-center h-40 animate-pulse bg-gradient-to-br from-white/5 via-white/10 to-white/5 rounded-2xl border border-white/20 backdrop-blur-md'>
          <p className='text-sm text-white/50'>Loading voting data...</p>
        </div>
      )}
    </div>
  );
}
