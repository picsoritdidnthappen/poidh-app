import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useState } from 'react';

import {joinOpenBounty} from '@/app/context/web3';
import { toast } from 'react-toastify';




interface FormJoinBountyProps {
  bountyId: string;
  showForm?: boolean;
}


const FormJoinBounty: React.FC<FormJoinBountyProps> = ({ bountyId }) => {
const [amount, setAmount] = useState('');
const { primaryWallet } = useDynamicContext();
const [walletMessage, setWalletMessage] = useState('');


const handleJoinBounty = async () => {
  if (!amount || !primaryWallet) {
    toast.error("Please fill in all fields and connect wallet");
    return;
  }
  try {
    await joinOpenBounty(primaryWallet, bountyId, amount);
    toast.success("Bounty joined successfully!");
    setAmount('');
  } catch (error: unknown) {
    console.error('Error joining:', error);
    // Use a more detailed check to find the error code
    const errorCode = (error as any)?.info?.error?.code;
    if (errorCode === 4001) {
        toast.error('Transaction denied by user');
    } else {
        toast.error("Failed to join bounty");
    }
  }
};





return (
<>
<div className='flex w-fit flex-col '>
    <span>reward</span>
      <input
        type="number"
        placeholder=""
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="border bg-transparent border-[#D1ECFF] py-2 px-2 rounded-md mb-4"
      />
    <button 
    className={`border border-white rounded-full px-5 py-2  backdrop-blur-sm bg-white/30 ${
      !primaryWallet ? "opacity-50 cursor-not-allowed" : ""
    }`}
    onClick={() => {
      if (!primaryWallet) {
        toast.error("Please connect wallet to continue")

      } else {
        handleJoinBounty();
      }
    }}
    onMouseEnter={() => {
      if (!primaryWallet) {
        toast.error("Please connect wallet to continue")

      }
    }}
    onMouseLeave={() => {
      setWalletMessage("");
    }}
    
    >join bounty</button>

</div>
</>
);
};

export default FormJoinBounty;
