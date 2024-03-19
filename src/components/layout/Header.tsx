//@ts-nocheck
import ConnectWallet from '@/components/ConnectWallet';
import React, { useState, useEffect } from 'react';

import Menu from '@/components/global/Menu';
import Logo from '@/components/ui/Logo';
import {
  useDynamicContext,
} from '@dynamic-labs/sdk-react-core'
import Link from 'next/link';
import { EthersExtension } from "@dynamic-labs/ethers-v6";
import { Contract, ethers } from "ethers";
import abi from '@/app/context/abi';
import { getProvider, getSigner, getContract } from '@/__tests__/functions';
import { Value } from 'sass';






const Header = () => {
  const { isAuthenticated, primaryWallet } = useDynamicContext();

  // const [signer, setSigner] = useState(null);
  // const [contract, setContract] = useState(null);

  // const contractAddress = "0x0Aa50ce0d724cc28f8F7aF4630c32377B4d5c27d";

  

//   useEffect(() => {
//     const fetchSigner = async () => {
//       const signer = await primaryWallet?.connector.ethers?.getSigner();
//       setSigner(signer);
//     };

//     fetchSigner();
//   }, [primaryWallet]);



//     console.log(signer?.address)


//   const contract1 = new ethers.Contract(contractAddress, abi, signer?.address);

//   console.log(contract1)



//   const createBountyT = async () => {
//  try{
    
//     const userAddress = "0x7aeb953571294652527b14DF6Bce207B5E3915F1"

//     const userBounties = await contract1.getBountiesByUser(
//       userAddress
//     );
//     console.log(userBounties)

//   } catch (error) {
//     console.error("Error occurred during creating bounty:", error);
// }

//   }



//   createBountyT()

  return (
  <div className=' px-5 lg:px-20 py-12 border-b border-white flex justify-between items-center'>
      <Link href="/">
      <Logo/>
      </Link>
      <Menu  menuPoints={['about us', 'how it works']} />
      <div className='flex flex-row items-baseline gap-x-5'>
     
      { isAuthenticated ? <Link href="/account" >my bounties</Link> : null}

      <ConnectWallet/>

      </div>
  </div>
  );
};

export default Header;