import React, { useEffect, useState } from 'react';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

import { cancelSoloBounty, fetchBountyById,  } from '@/app/context/web3';

interface BountyData {
  id: number;
  issuer: string;
  name: string;
  description: string;
  value: string;
  claimer: string;
  createdAt: string;
  claimId: string;
}

const NoProof = ({ bountyId }: { bountyId: string }) => {
  const { primaryWallet } = useDynamicContext();
  const [bountyData, setBountyData] = useState<BountyData | null>(null);

  const [youOwner, setYouOwner] = useState<boolean | null>(null);
  const [bountyCanceled, setBountyCanceled] = useState<boolean | null>(null);

  const walletConnected = primaryWallet?.connected;


  const handleCancelBounty = async () => {
    try {
      await cancelSoloBounty(primaryWallet, bountyId);
      alert('Bounty canceled successfully!');
    } catch (error) {
      console.error('Error canceling bounty:', error);
      alert('Failed to cancel bounty.');
    }
  };

  const handleAddProof = async () => {
    try {
      alert('Proof added successfully!');
    } catch (error) {
      console.error('Error adding proof:', error);
      alert('Failed to add proof.');
    }
  };

  useEffect(() => {
    setYouOwner(null);
    setBountyCanceled(null);

    if (bountyId) {
      fetchBountyById(bountyId)
        .then(data => {
          setBountyData(data);
          setYouOwner(primaryWallet?.address === data.issuer);
          setBountyCanceled(data.issuer === data.claimer);

        })
        .catch(console.error);
    }
  }, [primaryWallet, bountyId]);





  return (
    <div className='flex flex-col text-center my-20 w-full items-center'>
      <span>      
        { !bountyCanceled ?  "this bounty has not yet received any proof." : "bounty canceled"}
      </span>
      {walletConnected && youOwner && !bountyCanceled ? (
        <button onClick={handleCancelBounty} className='border border-[#F15E5F] text-[#F15E5F] rounded-md py-2 px-5 mt-5'>
          cancel bounty
        </button>
      ) : walletConnected && !youOwner && !bountyCanceled ? (
        <button onClick={handleAddProof} className='border hidden rounded-md py-2 px-5 mt-5 border-blue-500'>
          add proof
        </button>
      ) : null}

    </div>
  );
};

export default NoProof;
