import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { PieChart } from '@mui/x-charts/PieChart';
import React, { useEffect, useState } from 'react';

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
  const [deadlineTimestamp, setDeadlineTimestamp] = useState<number | null>(
    null
  );
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
        setDeadlineTimestamp(parseInt(voting.deadline));
      })();
    }
  }, [bountyId]);

  const voteYes = async () => {
    if (!bountyId || !primaryWallet) {
      alert('Please connect wallet');
      return;
    }
    try {
      await voteClaim(primaryWallet, bountyId, true);
      alert('Vote made successfully!');
    } catch (error) {
      console.error('Error vote:', error);
      alert('Failed to vote');
    }
  };

  const voteNo = async () => {
    if (!bountyId || !primaryWallet) {
      alert('Please connect wallet');
      return;
    }
    try {
      await voteClaim(primaryWallet, bountyId, false);
      alert('Vote made successfully!');
    } catch (error) {
      console.error('Error vote:', error);
      alert('Failed to vote');
    }
  };

  const resolveVoteHandle = async () => {
    if (!bountyId || !primaryWallet) {
      alert('Please connect wallet');
      return;
    }
    try {
      await resolveVote(primaryWallet, bountyId);
      alert('Vote resolve successfully!');
    } catch (error) {
      console.error('Error resolve vote:', error);
      alert('Failed to resolve vote');
    }
  };

  const isVotingPeriodOver = () => {
    if (deadlineTimestamp === null) return false;
    const currentTime = Math.floor(Date.now() / 1000);
    return currentTime > deadlineTimestamp;
  };

  console.log(
    'Voting period over:',
    isVotingPeriodOver(),
    'Current time:',
    Math.floor(Date.now() / 1000),
    'Deadline:',
    deadlineTimestamp
  );

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
            {isVotingPeriodOver() && (
              <button
                className='border mt-5 border-white rounded-full px-5 py-2 flex justify-between items-center backdrop-blur-sm bg-[#D1ECFF]/20 w-fit'
                onClick={resolveVoteHandle}
              >
                resolve vote
              </button>
            )}
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
