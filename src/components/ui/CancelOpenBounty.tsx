import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import React from 'react';

import { cancelOpenBounty } from '@/app/context/web3';

interface CancelOpenBountyyProps {
  bountyId: string;
}

const CancelOpenBounty: React.FC<CancelOpenBountyyProps> = ({ bountyId }) => {
  const { primaryWallet } = useDynamicContext();

  const handleCancelOpenBounty = async () => {
    if (!primaryWallet) {
      alert('Please fill in all fields and connect wallet');
      return;
    }
    try {
      await cancelOpenBounty(primaryWallet, bountyId);
      alert('Bounty canceled successfully!');
    } catch (error) {
      console.error('Error canceling:', error);
      alert('Failed to cancel.');
    }
  };

  return (
    <div className=''>
      <button
        onClick={handleCancelOpenBounty}
        className=' border border-[#D1ECFF] backdrop-blur-sm bg-white/30 rounded-full p-2'
      >
        cancel bounty
      </button>
    </div>
  );
};

export default CancelOpenBounty;
