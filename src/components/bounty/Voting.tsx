import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { PieChart } from '@mui/x-charts/PieChart';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import {
  bountyVotingTracker,
  resolveVote,
  voteClaim,
} from '@/app/context/web3';

import { VotingTracker } from '@/types/web3';

interface VotingProps {
  bountyId: string;
}

const Voting: React.FC<VotingProps> = ({ bountyId }) => {
  const [votingData, setVotingData] = useState<VotingTracker | null>(null);
  const { primaryWallet } = useDynamicContext();

  const weiToEth = (weiValue: string) => parseFloat(weiValue) / 10 ** 18;

  useEffect(() => {
    if (bountyId) {
      (async () => {
        const voting = await bountyVotingTracker(bountyId);
        setVotingData({
          ...voting,
          yes: weiToEth(voting.yes).toString(),
          no: weiToEth(voting.no).toString(),
          deadline: new Date(parseInt(voting.deadline) * 1000).toLocaleString(),
        });
      })();
    }
  }, [bountyId]);

  const voteYes = async () => {
    if (!bountyId || !primaryWallet) {
      toast.error('Please connect wallet');
      return;
    }
    try {
      await voteClaim(primaryWallet, bountyId, true);
      toast.success('Vote made successfully!');
    } catch (error: unknown) {
      console.error('Failed to vote', error);
      const errorCode = (error as any)?.info?.error?.code;
      if (errorCode === 4001) {
        toast.error('Transaction denied by user');
      } else {
        toast.error('Failed to vote');
      }
    }
  };

  const voteNo = async () => {
    if (!bountyId || !primaryWallet) {
      toast.error('Please connect wallet');
      return;
    }
    try {
      await voteClaim(primaryWallet, bountyId, false);
      toast.success('Vote made successfully!');
    } catch (error: unknown) {
      console.error('Failed to vote', error);
      const errorCode = (error as any)?.info?.error?.code;
      if (errorCode === 4001) {
        toast.error('Transaction denied by user');
      } else {
        toast.error('Failed to vote');
      }
    }
  };

  const resolveVoteHandle = async () => {
    if (!bountyId || !primaryWallet) {
      toast.error('Please connect wallet');
      return;
    }
    try {
      await resolveVote(primaryWallet, bountyId);
      toast.success('Vote resolved successfully!');
    } catch (error: unknown) {
      console.error('Failed to resolve vote', error);
      const errorCode = (error as any)?.info?.error?.code;
      if (errorCode === 4001) {
        toast.error('Transaction denied by user');
      } else {
        toast.error('Failed to resolve vote');
      }
    }
  };

  return (
    <div className='col-span-12 lg:col-span-3 p-5 lg:p-0 '>
      {votingData ? (
        <>
          <div className='flex items-center mb-5'>
            <PieChart
              series={[
                {
                  data: [
                    { id: 0, value: weiToEth(votingData.yes), label: 'Yes' },
                    { id: 1, value: weiToEth(votingData.no), label: 'No' },
                  ],
                },
              ]}
              width={400}
              height={200}
            />
          </div>

          <div>Yes votes: {votingData.yes} degen</div>
          <div>No votes: {votingData.no} degen</div>

          <div className='flex flex-row gap-x-5 '>
            <button
              className='border mt-5 border-white rounded-full px-5 py-2 flex justify-between items-center backdrop-blur-sm bg-[#D1ECFF]/20 w-fit'
              onClick={voteYes}
            >
              yes
            </button>
            <button
              className='border mt-5 border-white rounded-full px-5 py-2 flex justify-between items-center backdrop-blur-sm bg-[#D1ECFF]/20 w-fit'
              onClick={voteNo}
            >
              no
            </button>
            <button
              className='border mt-5 border-white rounded-full px-5 py-2 flex justify-between items-center backdrop-blur-sm bg-[#D1ECFF]/20 w-fit'
              onClick={resolveVoteHandle}
            >
              resolve vote
            </button>
          </div>

          <div className='mt-5 '>Deadline: {votingData.deadline}</div>
        </>
      ) : (
        <div>Loading voting data...</div>
      )}
    </div>
  );
};

export default Voting;
