import { PieChart } from 'react-minimal-pie-chart';
import React from 'react';
import { toast } from 'react-toastify';
import { formatEther } from 'viem';

import { useGetChain } from '@/hooks/useGetChain';
import { bountyVotingTracker } from '@/utils/web3';
import { useAccount, useSwitchChain, useWriteContract } from 'wagmi';
import abi from '@/constant/abi/abi';
import { useMutation, useQuery } from '@tanstack/react-query';
import { trpc } from '@/trpc/client';

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
  const chain = useGetChain();
  const writeContract = useWriteContract({});
  const switctChain = useSwitchChain();

  const voting = useQuery({
    queryKey: ['bountyVotingTracker', { id: bountyId, chainName: chain.slug }],
    queryFn: () => bountyVotingTracker({ id: bountyId, chainName: chain.slug }),
  });

  const bounty = trpc.bounty.useQuery({
    id: Number(bountyId),
    chainId: chain.id,
  });

  const bountyContibutors = trpc.participations.useQuery({
    chainId: chain.id,
    bountyId: Number(bountyId),
  });

  const isBountyContributor = bountyContibutors.data?.some(
    (contributor) =>
      contributor.user_address.toLowerCase() == account.address?.toLowerCase()
  );
  const isVotingInProgress =
    parseInt(voting.data?.deadline ?? '0') * 1000 > Date.now();

  const voteMutation = useMutation({
    mutationFn: async ({
      vote,
      bountyId,
    }: {
      vote: boolean;
      bountyId: bigint;
    }) => {
      const chainId = await account.connector?.getChainId();
      if (chain.id !== chainId) {
        await switctChain.switchChainAsync({ chainId: chain.id });
      }
      await writeContract.writeContractAsync({
        abi,
        address: chain.contracts.mainContract as `0x${string}`,
        functionName: 'voteClaim',
        args: [bountyId, vote],
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
      voting.refetch();
    },
  });

  const resolveVoteMutation = useMutation({
    mutationFn: async (bountyId: bigint) => {
      const chainId = await account.connector?.getChainId();
      if (chain.id !== chainId) {
        await switctChain.switchChainAsync({ chainId: chain.id });
      }
      await writeContract.writeContractAsync({
        abi,
        address: chain.contracts.mainContract as `0x${string}`,
        functionName: 'resolveVote',
        args: [bountyId],
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
    <div className='col-span-12 lg:col-span-3 p-5 lg:p-0 '>
      {voting.data ? (
        <div>
          <div className='text-center'>
            {isAcceptedBounty ? 'Voting closed' : 'Voting in progress'}
          </div>
          <div className='flex items-center mb-5'>
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
              radius={35}
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
                    style={{ fontSize: '3.5px', pointerEvents: 'none' }}
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
                      y={y + 3}
                      dx={dataEntry.percentage === 100 ? 0 : dx}
                      dy={dataEntry.percentage === 100 ? 0 : dy}
                    >
                      {dataEntry.title}
                    </tspan>
                  </text>
                );
              }}
              labelStyle={() => ({
                fontSize: '3px',
                fontWeight: 'bold',
              })}
              animate
            />
          </div>

          <div>
            {`Yes votes: ${formatEther(BigInt(voting.data.yes || 0))} ${
              chain.currency
            }`}
          </div>
          <div>
            {`No votes: ${formatEther(BigInt(voting.data.no || 0))} ${
              chain.currency
            }`}
          </div>
          <div className='flex flex-row gap-x-5 '>
            {isVotingInProgress
              ? isBountyContributor && (
                  <div>
                    <div className='mt-3'>what is your vote?</div>
                    <div className='flex flex-row gap-x-5 mt-2'>
                      <button
                        className='border border-white rounded-full px-5 py-1 flex items-center justify-center backdrop-blur-sm bg-[#D1ECFF]/20 min-w-[80px] text-center'
                        onClick={() => {
                          if (account.address) {
                            voteMutation.mutate({
                              vote: true,
                              bountyId: BigInt(bountyId),
                            });
                          } else {
                            toast.error('Please connect wallet to continue');
                          }
                        }}
                      >
                        yes
                      </button>
                      <button
                        className='border border-white rounded-full px-5 py-1 flex items-center justify-center backdrop-blur-sm bg-[#D1ECFF]/20 min-w-[80px] text-center'
                        onClick={() => {
                          if (account.address) {
                            voteMutation.mutate({
                              vote: false,
                              bountyId: BigInt(bountyId),
                            });
                          } else {
                            toast.error('Please connect wallet to continue');
                          }
                        }}
                      >
                        no
                      </button>
                    </div>
                  </div>
                )
              : !isAcceptedBounty && (
                  <button
                    className='border mt-5 border-white rounded-full px-5 py-2 flex justify-between items-center backdrop-blur-sm bg-[#D1ECFF]/20 w-fit'
                    onClick={() => {
                      if (account.address) {
                        resolveVoteMutation.mutate(BigInt(bountyId));
                      } else {
                        toast.error('Please connect wallet to continue');
                      }
                    }}
                  >
                    resolve vote
                  </button>
                )}
          </div>

          {!isAcceptedBounty && (
            <div className='mt-5 '>
              Deadline:{' '}
              {formatDeadline(
                new Date(parseInt(voting.data.deadline ?? '0') * 1000)
              )}
            </div>
          )}
        </div>
      ) : (
        <div className='animate-pulse text-center'>Loading voting data...</div>
      )}
    </div>
  );
}
