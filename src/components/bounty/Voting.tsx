import { PieChart } from '@mui/x-charts/PieChart';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { formatEther } from 'viem';

import { useGetChain } from '@/hooks/useGetChain';
import { bountyVotingTracker } from '@/utils/web3';
import { useAccount, useSwitchChain, useWriteContract } from 'wagmi';
import abi from '@/constant/abi/abi';
import { useMutation } from '@tanstack/react-query';

export default function Voting({ bountyId }: { bountyId: string }) {
  const account = useAccount();
  const chain = useGetChain();
  const writeContract = useWriteContract({});
  const [voting, setVoting] = useState<{
    yes: string;
    no: string;
    deadline: string;
  } | null>(null);
  const switctChain = useSwitchChain();

  const fetchVotingData = () => {
    bountyVotingTracker({
      id: bountyId,
      chainName: chain.slug,
    }).then(setVoting);
  };

  useEffect(() => {
    fetchVotingData();
  });

  const voteMutation = useMutation({
    mutationFn: async ({
      vote,
      bountyId,
    }: {
      vote: boolean;
      bountyId: bigint;
    }) => {
      if (chain.id !== account.chainId) {
        await switctChain.switchChainAsync({ chainId: chain.id });
      }
      await writeContract.writeContractAsync({
        __mode: 'prepared',
        abi,
        address: chain.contracts.mainContract as `0x${string}`,
        functionName: 'voteClaim',
        args: [bountyId, vote],
        chainId: chain.id,
      });

      fetchVotingData();
    },
  });

  const resolveVoteMutation = useMutation({
    mutationFn: async (bountyId: bigint) => {
      if (chain.id !== account.chainId) {
        await switctChain.switchChainAsync({ chainId: chain.id });
      }
      await writeContract.writeContractAsync({
        __mode: 'prepared',
        abi,
        address: chain.contracts.mainContract as `0x${string}`,
        functionName: 'resolveVote',
        args: [bountyId],
        chainId: chain.id,
      });

      fetchVotingData();
    },
  });

  useEffect(() => {
    if (voteMutation.isSuccess) {
      toast.success('Voted successfully');
    }
    if (voteMutation.isError) {
      toast.error('Failed to vote');
    }
  }, [voteMutation.isSuccess, voteMutation.isError]);

  useEffect(() => {
    if (resolveVoteMutation.isSuccess) {
      toast.success('Vote resolved successfully');
    }
    if (resolveVoteMutation.isError) {
      toast.error('Failed to resolve vote');
    }
  }, [resolveVoteMutation.isSuccess, resolveVoteMutation.isError]);

  return (
    <div className='col-span-12 lg:col-span-3 p-5 lg:p-0 '>
      {voting ? (
        <>
          <div className='flex items-center mb-5'>
            <PieChart
              series={[
                {
                  data: [
                    {
                      id: 0,
                      value: Number(formatEther(BigInt(voting.yes || 0))),
                      label: 'Yes',
                    },
                    {
                      id: 1,
                      value: Number(formatEther(BigInt(voting.no || 0))),
                      label: 'No',
                    },
                  ],
                },
              ]}
              width={400}
              height={200}
            />
          </div>

          <div>
            Yes votes: {formatEther(BigInt(voting.yes || 0))}
            {chain.currency}
          </div>
          <div>
            No votes: {formatEther(BigInt(voting.no || 0))}
            {chain.currency}
          </div>

          <div className='flex flex-row gap-x-5 '>
            <button
              className='border mt-5 border-white rounded-full px-5 py-2 flex justify-between items-center backdrop-blur-sm bg-[#D1ECFF]/20 w-fit'
              onClick={() => {
                if (account.isConnected) {
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
              className='border mt-5 border-white rounded-full px-5 py-2 flex justify-between items-center backdrop-blur-sm bg-[#D1ECFF]/20 w-fit'
              onClick={() => {
                if (account.isConnected) {
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
            <button
              className='border mt-5 border-white rounded-full px-5 py-2 flex justify-between items-center backdrop-blur-sm bg-[#D1ECFF]/20 w-fit'
              onClick={() => {
                if (account.isConnected) {
                  resolveVoteMutation.mutate(BigInt(bountyId));
                } else {
                  toast.error('Please connect wallet to continue');
                }
              }}
            >
              resolve vote
            </button>
          </div>

          <div className='mt-5 '>
            Deadline:{' '}
            {new Date(parseInt(voting.deadline ?? '0') * 1000).toLocaleString()}
          </div>
        </>
      ) : (
        <div>Loading voting data...</div>
      )}
    </div>
  );
}
