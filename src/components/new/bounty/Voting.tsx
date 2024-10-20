/* eslint-disable simple-import-sort/imports */
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { PieChart } from '@mui/x-charts/PieChart';
import React from 'react';
import { toast } from 'react-toastify';
import { formatEther } from 'viem';

import { useGetChain } from '@/hooks/new/useGetChain';
import { resolveVote, voteClaim } from '@/app/context';
import { trpc } from '@/trpc/client';

export default function Voting({ bountyId }: { bountyId: string }) {
  const { primaryWallet } = useDynamicContext();
  const chain = useGetChain();

  const { data: voting } = trpc.bountyVoting.useQuery({
    bountyId,
    chainId: chain.id.toString(),
  });

  const voteHandler = async (vote: boolean) => {
    if (!bountyId || !primaryWallet) {
      toast.error('Please connect wallet');
      return;
    }
    try {
      await voteClaim(primaryWallet, bountyId, vote);
      toast.success('Vote made successfully!');
    } catch (error: any) {
      if (error.info?.error?.code !== 4001) {
        toast.error('Failed to vote');
      }
    }
  };

  const resolveVoteHandler = async () => {
    if (!bountyId || !primaryWallet) {
      toast.error('Please connect wallet');
      return;
    }
    try {
      await resolveVote(primaryWallet, bountyId);
      toast.success('Vote resolved successfully!');
    } catch (error: any) {
      if (error.info?.error?.code !== 4001) {
        toast.error('Failed to resolve vote');
      }
    }
  };

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
                      value: Number(
                        formatEther(BigInt(voting.yes?.toString() || 0))
                      ),
                      label: 'Yes',
                    },
                    {
                      id: 1,
                      value: Number(
                        formatEther(BigInt(voting.no?.toString() || 0))
                      ),
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
            Yes votes: {formatEther(BigInt(voting.yes?.toString() || 0))}
            {chain.currency}
          </div>
          <div>
            No votes: {formatEther(BigInt(voting.no?.toString() || 0))}
            {chain.currency}
          </div>

          <div className='flex flex-row gap-x-5 '>
            <button
              className='border mt-5 border-white rounded-full px-5 py-2 flex justify-between items-center backdrop-blur-sm bg-[#D1ECFF]/20 w-fit'
              onClick={() => voteHandler(true)}
            >
              yes
            </button>
            <button
              className='border mt-5 border-white rounded-full px-5 py-2 flex justify-between items-center backdrop-blur-sm bg-[#D1ECFF]/20 w-fit'
              onClick={() => voteHandler(false)}
            >
              no
            </button>
            <button
              className='border mt-5 border-white rounded-full px-5 py-2 flex justify-between items-center backdrop-blur-sm bg-[#D1ECFF]/20 w-fit'
              onClick={resolveVoteHandler}
            >
              resolve vote
            </button>
          </div>

          <div className='mt-5 '>
            Deadline:{' '}
            {new Date(
              parseInt(voting.deadline?.toString() ?? '0') * 1000
            ).toLocaleString()}
          </div>
        </>
      ) : (
        <div>Loading voting data...</div>
      )}
    </div>
  );
}
