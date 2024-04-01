"use client"
import { useEffect, useState } from 'react';
import {  ethers } from "ethers";

import {
  useDynamicContext,
  useUserWallets,
} from '@dynamic-labs/sdk-react-core'
import { getSigner, getContract, getBountiesByUser, getProvider, getClaimsByUser } from '@/app/context/web3';
import Button from '@/components/ui/Button';
import BountyList from '@/components/ui/BountyList';


interface BountiesData {
  id: string;
  issuer: string;
  name: string;
  description: string;
  value: string;
  claimer: string;
  createdAt: string;
  claimId: string;
}

interface ClaimsData {
  accepted: boolean;
  bountyId: string;
  bountyIssuer: string;
  createdAt: string;
  description: string;
  id: string;
  issuer: string;
  name: string;
}



const AccountInfo = () => {
  const {isAuthenticated, primaryWallet } = useDynamicContext();
  const userWallets = useUserWallets()
  const [userAddress, setUserAddress] = useState("0x...111")
  const [bountiesData, setBountiesData] = useState<BountiesData[]>([]);
  const [claimsData, setClaimsData] = useState<ClaimsData[]>([]);

  const [completedBounties, setCompletedBounties] = useState("");
  const [inProgressBounties, setInProgressBounties] = useState("");
  const [ETHinContract, setETHinContract] = useState("");
  const [completedClaims, setCompletedClaims] = useState("");




// user info
  useEffect(() => {
    const userInformation = async () => {
      const signer = await getSigner(primaryWallet);
      const provider = await getProvider(primaryWallet)
      const contract = await getContract(signer)
      
      const address = signer.address;
      const formattedAddress = `${address.slice(0, 5)}...${address.slice(-6)}`;
      setUserAddress(formattedAddress);

      const contractBalance = await provider.getBalance(contract.getAddress())
      const balanceETH = ethers.formatEther(contractBalance)
      setETHinContract(balanceETH)


      getBountiesByUser(address, 0)
     .then((data: any) => {
      setBountiesData(data)
      const completedBounties = data.filter((bounty:any) => bounty.claimer !== '0x0000000000000000000000000000000000000000' && bounty.claimer.toLowerCase() !== address.toLowerCase()).length;
      const inProgressBounties = data.filter((bounty:any) => bounty.claimer === '0x0000000000000000000000000000000000000000').length;
      setInProgressBounties(inProgressBounties);
      setCompletedBounties(completedBounties);
    })

    getClaimsByUser(address)
    .then((data: any) => {
      setClaimsData(data);
      const completedClaims = data.filter((claim: any) => claim.accepted !== true).length;
      setCompletedClaims(completedClaims);
      console.log(claimsData); 
    });





    return formattedAddress;
    };
  
    if (primaryWallet) {
      userInformation().catch(console.error);
    }
  }, [primaryWallet]);
  

  return (
    <div>
  { isAuthenticated ? (
    <div>
        <div className='flex flex-col lg:flex-row lg:justify-between lg:items-start'>
        <div>
            <div className='flex flex-col border-b border-dashed'>
            <span>user</span>
            <span className='text-4xl'>{userAddress}</span>
          </div>

        <div className='flex flex-col'>
      <div>completed bounties: <span className='font-bold' >{completedBounties}</span></div>
      <div>total eth paid: <span className='font-bold' >0.0144</span>  </div>
      <div>in progress bounties: <span className='font-bold' >{inProgressBounties}</span> </div>
      <div>total eth in contract: <span className='font-bold' >{ETHinContract}</span>  </div>
      <div>completed claims: <span className='font-bold' >{completedClaims}</span></div>
      <div>total eth earned: <span className='font-bold' >0.0109</span>  </div>

     

        </div>
      
        </div>
    <div className='flex flex-col '>
    <span>poidh score:</span>
    <span className='text-4xl text-[#F15E5F] border-y border-dashed'>123456</span>
   </div>

    

      </div>
    {/* {userWallets.map((wallet) => (
          <p key={wallet.id}>
            {wallet.address}: {wallet.connected ? 'Connected' : 'Not connected'}
          </p>
        ))} */}

    <div>
      <BountyList  bountiesData={bountiesData} />
    </div>
   </div>
      ) : (
        <div className='h-screen w-full flex items-center justify-center flex-col' >
          <h2 className='my-5'>start poidh journey!</h2>
          <Button>connect wallet</Button>
        </div>
      )
    }
  </div>
  );
};

export default AccountInfo;