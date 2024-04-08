import { bountyVotingTracker , voteClaim, resolveVote} from '@/app/context/web3';
import { VotingTracker } from '@/types/web3';
import React, { useEffect, useState } from 'react';
import { PieChart } from '@mui/x-charts/PieChart';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

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

    if ( !bountyId || !primaryWallet ) {
      alert("Please connect wallet");
      return;
    }
    try {
      await voteClaim(primaryWallet, bountyId, true );
      alert("Vote made successfully!");
     
    } catch (error) {
      console.error('Error vote:', error);
      alert("Failed to vote");
    }

  }

  const voteNo = async () => {

    if ( !bountyId || !primaryWallet ) {
      alert("Please connect wallet");
      return;
    }
    try {
      await voteClaim(primaryWallet, bountyId, false );
      alert("Vote made successfully!");
     
    } catch (error) {
      console.error('Error vote:', error);
      alert("Failed to vote");
    }

  }


  const resolveVoteHandle = async () => {

    if ( !bountyId || !primaryWallet ) {
      alert("Please connect wallet");
      return;
    }
    try {
      await resolveVote(primaryWallet, bountyId );
      alert("Vote resolve successfully!");
     
    } catch (error) {
      console.error('Error resolve vote:', error);
      alert("Failed to resolve vote");
    }

  }


  







  console.log(bountyId)

  return (
    <div>
      {votingData ? (
        <>
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
          <div>Yes votes: {votingData.yes} ETH</div>
          <div>No votes: {votingData.no} ETH</div>

            <div className='flex flex-row gap-x-5 '>
              
              <button 
              className='border mt-5 border-white rounded-full px-5 py-2 flex justify-between items-center backdrop-blur-sm bg-[#D1ECFF]/20 w-fit'
               onClick={voteYes} >yes</button>
              <button
               className='border mt-5 border-white rounded-full px-5 py-2 flex justify-between items-center backdrop-blur-sm bg-[#D1ECFF]/20 w-fit'
               onClick={voteNo}
                >no</button>
               <button
               className='border mt-5 border-white rounded-full px-5 py-2 flex justify-between items-center backdrop-blur-sm bg-[#D1ECFF]/20 w-fit'
               onClick={resolveVoteHandle}
                >resolve vote</button>


              
            </div>  

          <div>Deadline: {votingData.deadline}</div>
        </>
      ) : (
        <div>Loading voting data...</div>
      )}
    </div>
  );
};

export default Voting;
