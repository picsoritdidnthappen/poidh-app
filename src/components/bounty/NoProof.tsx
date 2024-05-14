import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import { cancelSoloBounty, fetchBountyById } from '@/app/context/web3';

import { Bounty } from '@/types/web3';

const NoProof = ({ bountyId }: { bountyId: string }) => {
  const { primaryWallet } = useDynamicContext();
  const [bountyData, setBountyData] = useState<Bounty | null>(null);

  const [youOwner, setYouOwner] = useState<boolean | null>(null);
  const [bountyCanceled, setBountyCanceled] = useState<boolean | null>(null);

  const walletConnected = primaryWallet?.connected;

  const handleCancelBounty = async () => {
    if (primaryWallet) {
      try {
        await cancelSoloBounty(primaryWallet, bountyId);
        toast.success('Bounty canceled successfully!');
      } catch (error) {
        console.error('Error canceling bounty:', error);
        toast.error('Failed to cancel bounty.');
      }
    } else {
      toast.error('Please connect your wallet first.');
    }
  };

  const handleAddProof = async () => {
    try {
      toast.success('Claim added successfully!');
    } catch (error) {
      console.error('Error adding proof:', error);
      toast.error('Failed to add claim!');
    }
  };

  useEffect(() => {
    setYouOwner(null);
    setBountyCanceled(null);

    if (bountyId) {
      fetchBountyById(bountyId)
        .then((data) => {
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
        {!bountyCanceled
          ? 'this bounty has not yet received a claim'
          : 'bounty canceled'}
      </span>
      {walletConnected && youOwner && !bountyCanceled ? (
        <button
          onClick={handleCancelBounty}
          className='border hidden border-[#F15E5F] text-[#F15E5F] rounded-md py-2 px-5 mt-5'
        >
          cancel bounty
        </button>
      ) : walletConnected && !youOwner && !bountyCanceled ? (
        <button
          onClick={handleAddProof}
          className='border hidden rounded-md py-2 px-5 mt-5 border-blue-500'
        >
          add claim
        </button>
      ) : null}
    </div>
  );
};

export default NoProof;
