import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useState } from 'react';

import {joinOpenBounty} from '@/app/context/web3';




interface FormJoinBountyProps {
  bountyId: string;
  showForm?: boolean;
}


const FormJoinBounty: React.FC<FormJoinBountyProps> = ({ bountyId }) => {
const [amount, setAmount] = useState('');
const { primaryWallet } = useDynamicContext();
const [walletMessage, setWalletMessage] = useState('');



const handleJoinBounty = async () => {
  if ( !amount || !primaryWallet ) {
    alert("Please fill in all fields and connect wallet");
    return;
  }
  try {
    await joinOpenBounty(primaryWallet, bountyId, amount );
    alert("Bounty created successfully!");
    setAmount('');
  } catch (error) {
    console.error('Error creating claim:', error);
    alert("Failed to create claim.");
  }
};



// const join = async () => {
//   const signer = await getSigner(primaryWallet);
//   const contract = await getContract(signer);
//   const joinB = await joinOpenBounty(signer, 0.004, 22 )
// }


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
        setWalletMessage("Please connect wallet to continue");
      } else {
        handleJoinBounty();
      }
    }}
    onMouseEnter={() => {
      if (!primaryWallet) {
        setWalletMessage("Please connect wallet to continue");
      }
    }}
    onMouseLeave={() => {
      setWalletMessage("");
    }}
    
    >join bounty</button>

</div>
    <span id="walletMessage">{walletMessage}</span>
</>
);
};

export default FormJoinBounty;
