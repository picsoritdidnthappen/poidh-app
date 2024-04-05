import React, {useState} from 'react';
import ButtonCTA from '@/components/ui/ButtonCTA';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { withdrawFromOpenBounty } from '@/app/context/web3';


interface WithdrawProps {
  bountyId: string;
}

const Withdraw: React.FC<WithdrawProps> = ({ bountyId }) => {
  const { primaryWallet } = useDynamicContext();



const handlewithdrawFromOpenBounty = async () => {
  if (  !primaryWallet ) {
    alert("Please fill in all fields and connect wallet");
    return;
  }
  try {
    await withdrawFromOpenBounty( primaryWallet, bountyId);
    alert("Bounty withdraw successful!");
  } catch (error) {
    console.error('Error withdraw', error);
    alert("Failed withdraw");
  }
};


  return (
    <div className=' py-12 w-fit '>
   <button className='border border-white rounded-full px-5 py-2  backdrop-blur-sm bg-white/30 ' onClick={handlewithdrawFromOpenBounty} > withdraw  </button>
    </div>
)};

export default Withdraw;
