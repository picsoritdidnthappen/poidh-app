import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useState } from 'react';
import { toast } from 'react-toastify';

import { joinOpenBounty } from '@/app/context';

export default function FormJoinBounty({ bountyId }: { bountyId: string }) {
  const [amount, setAmount] = useState<string>('');
  const { primaryWallet } = useDynamicContext();

  const handleJoinBounty = async () => {
    if (!primaryWallet) {
      toast.error('Please connect wallet and fill in all fields');
      return;
    }
    if (!amount) {
      toast.error('Please enter the amount to join the bounty');
      return;
    }

    try {
      const balance = await primaryWallet.connector.getBalance();
      if (parseFloat(balance || '0') < parseFloat(amount)) {
        toast.error('Insufficient funds for this transaction');
        return;
      }

      await joinOpenBounty(primaryWallet, bountyId, amount);
      toast.success('Bounty joined successfully!');
      setAmount('');
      window.location.reload();
    } catch (error: any) {
      if (error.info?.error?.code !== 4001) {
        if (
          error.info?.error?.message
            .toLowerCase()
            .includes('insufficient funds')
        ) {
          toast.error('Insufficient funds for this transaction');
        } else {
          toast.error('Failed to join bounty');
        }
      }
    }
  };

  return (
    <>
      <div className='flex w-fit flex-col '>
        <span>reward</span>
        <input
          type='number'
          placeholder=''
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className='border bg-transparent border-[#D1ECFF] py-2 px-2 rounded-md mb-4'
        />
        <button
          className={`border border-white rounded-full px-5 py-2  backdrop-blur-sm bg-white/30 ${
            !primaryWallet ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          onClick={() => {
            if (!primaryWallet) {
              toast.error('Please connect wallet to continue');
            } else {
              handleJoinBounty();
            }
          }}
        >
          join bounty
        </button>
      </div>
    </>
  );
}
