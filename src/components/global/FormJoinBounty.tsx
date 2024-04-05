import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useState } from 'react';
import { joinOpenBounty, getContract, getSigner} from '@/app/context/web3';




interface FormJoinBountyProps {
  bountyId: string;
  showForm?: boolean;
}


const FormJoinBounty: React.FC<FormJoinBountyProps> = ({ bountyId }) => {
const [amount, setAmount] = useState('');
const { primaryWallet } = useDynamicContext();



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
<div className='flex flex-col '>
    <span>reward</span>
      <input
        type="number"
        placeholder=""
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="border bg-transparent border-[#D1ECFF] py-2 px-2 rounded-md mb-4"
      />
    <button className='border border-white rounded-full px-5 py-2  backdrop-blur-sm bg-white/30 ' onClick={handleJoinBounty}>join bounty</button>
</div>
);
};

export default FormJoinBounty;
