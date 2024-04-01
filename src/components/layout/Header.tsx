//@ts-nocheck
"use client"
import ConnectWallet from '@/components/web3/ConnectWallet';
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
  const { isAuthenticated } = useDynamicContext();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  


  return (
  <div className=' px-5 lg:px-20 py-12 border-b border-white flex justify-between items-center'>
      <Link href="/">
      <Logo/>
      </Link>
      <Menu  menuPoints={['about us', 'how it works']} />
      <div className='flex flex-row items-baseline gap-x-5'>
     
      {isClient && isAuthenticated ? <Link href="/account">my bounties</Link> : null}


     {isClient ? <ConnectWallet/> : null } 

      </div>
  </div>
  );
};

export default Header;