import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import React from 'react';
import { toast } from 'react-toastify';

import { withdrawFromOpenBounty } from '@/app/context/web3';

interface WithdrawProps {
  bountyId: string;
}

const Withdraw: React.FC<WithdrawProps> = ({ bountyId }) => {
  const { primaryWallet } = useDynamicContext();

  const handlewithdrawFromOpenBounty = async () => {
    if (!primaryWallet) {
      toast.error('Please fill in all fields and connect wallet');
      return;
    }
    try {
      await withdrawFromOpenBounty(primaryWallet, bountyId);
      toast.success('withdraw successful!');
    } catch (error: unknown) {
      console.error('Error joining:', error);
      // Use a more detailed check to find the error code
      const errorCode = (error as any)?.info?.error?.code;
      if (errorCode === 4001) {
        toast.error('Transaction denied by user');
      } else {
        toast.error('withdraw failed');
      }
    }
  };

  return (
    <div className=' py-12 w-fit '>
      <button
        className='border border-white rounded-full px-5 py-2  backdrop-blur-sm bg-white/30 '
        onClick={handlewithdrawFromOpenBounty}
      >
        {' '}
        withdraw{' '}
      </button>
    </div>
  );
};

export default Withdraw;
