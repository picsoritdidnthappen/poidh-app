'use client'
import React, { useContext, useState, useEffect } from 'react';
import Link from 'next/link';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import ConnectWallet from '@/components/web3/ConnectWallet';
import Logo from '@/components/ui/Logo';
import Menu from '@/components/global/Menu';
import { WalletContext } from '@/app/context/WalletProvider';

const Header = () => {
  const { isAuthenticated } = useDynamicContext();
  const [isClient, setIsClient] = useState(false);

  const walletContext = useContext(WalletContext);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const walletAddress = walletContext?.walletAddress;

  return (
    <div className='px-5 lg:px-20 py-12 border-b border-white flex justify-between items-center'>
      <Link href="/">
        <Logo/>
      </Link>
      <Menu menuPoints={['about us', 'how it works']} />
      <div className='flex flex-col '>


      <div className='flex flex-row relative items-center gap-x-5'>
        {isClient && isAuthenticated ? <Link href="/account">my bounties</Link> : null}
        {isClient ? <ConnectWallet /> : null}
        <div className='p-2 w-[40px] h-[40px] wallet  border-[#D1ECFF] border rounded-full backdrop-blur-sm bg-white/30'>
          <svg className='w-full' viewBox="-0.5 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                 <path d="M18 2.91992V10.9199" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                 <path d="M21.2008 7.71997L18.0008 10.92L14.8008 7.71997" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                 <path d="M10.58 3.96997H6C4.93913 3.96997 3.92178 4.39146 3.17163 5.1416C2.42149 5.89175 2 6.9091 2 7.96997V17.97C2 19.0308 2.42149 20.0482 3.17163 20.7983C3.92178 21.5485 4.93913 21.97 6 21.97H18C19.0609 21.97 20.0783 21.5485 20.8284 20.7983C21.5786 20.0482 22 19.0308 22 17.97V13.8999" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                 <path d="M2 9.96997H5.37006C6.16571 9.96997 6.92872 10.286 7.49133 10.8486C8.05394 11.4112 8.37006 12.1743 8.37006 12.97C8.37006 13.7656 8.05394 14.5287 7.49133 15.0913C6.92872 15.6539 6.16571 15.97 5.37006 15.97H2" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
           </svg>

        </div>
        {walletAddress && <span className='text-[10px]  wallet-address h-[35px] absolute top-[50px] right-0   border-[#D1ECFF] rounded-full border flex items-center justify-center px-5 backdrop-blur-sm bg-white/30'>{walletAddress}</span>}
        {!walletAddress && <span className='text-[10px]  wallet-address h-[35px] absolute top-[50px] right-0   border-[#D1ECFF] rounded-full border flex items-center justify-center px-5 backdrop-blur-sm bg-white/30'>no wallet connected</span>}

      </div>
      
      </div>

      


    </div>
  );
};

export default Header;
