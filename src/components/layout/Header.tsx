'use client';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useContext, useEffect, useState } from 'react';

// import { useRouter } from 'next/router';
import Banner from '@/components/global/Banner';
import Menu from '@/components/global/Menu';
import Footer from '@/components/layout/Footer';
import Logo from '@/components/ui/Logo';
import ConnectWallet from '@/components/web3/ConnectWallet';

import { WalletContext } from '@/app/context/WalletProvider';

const Header = () => {
  const router = useRouter();
  const {
    isAuthenticated,
    primaryWallet,
    network,
    networkConfigurations,
    walletConnector,
  } = useDynamicContext();
  const [currentNetwork, setCurrentNetwork] = useState(network);
  const [netstatus, currentNetworkStatus] = useState(false);
  const [currentNetworkName, setCurrentNetworkName] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const currentUrl =
    typeof window !== 'undefined' ? window.location.href.split('/')[3] : '';
  const [isShowDynamic, setIsShowDynamic] = useState(true);

  const handleOpenMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleOpenDynamic = () => {
    setIsShowDynamic(!isShowDynamic);
  };

  const walletContext = useContext(WalletContext);
  const path = usePathname();

  const [isChanged, setIsChanged] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (network && networkConfigurations && currentNetwork !== network) {
      const currentUrl = path.split('/')[1];
      const currentUrlNetwork = networkConfigurations['evm']?.find((net) =>
        net.name.toLowerCase().match(currentUrl)
      );
      if (
        currentUrl == currentUrlNetwork?.name.split(' ')[0].toLowerCase() &&
        !isChanged
      ) {
        setIsChanged(true);
        walletConnector?.switchNetwork({
          networkChainId: currentUrlNetwork?.chainId,
        });
      } else {
        setIsChanged(true);

        const networkname = networkConfigurations['evm']?.find(
          (net) => net.chainId === network
        );
        let networkNameToSet = networkname?.name?.toString().toLowerCase();
        if (networkNameToSet === 'degen chain') {
          networkNameToSet = 'degen';
        }
        if (networkNameToSet) {
          setCurrentNetwork(network);
          setCurrentNetworkName(networkNameToSet);
        }
        router.push(`/${networkNameToSet}`);
      }
    }
  }, []);

  useEffect(() => {
    setIsClient(true);
    if (network && networkConfigurations && currentNetwork !== network) {
      const currentUrl = path.split('/')[1];
      const currentUrlNetwork = networkConfigurations['evm']?.find((net) =>
        net.name.toLowerCase().match(currentUrl)
      );
      if (
        currentUrl == currentUrlNetwork?.name.split(' ')[0].toLowerCase() &&
        !isChanged
      ) {
        setIsChanged(true);
        walletConnector?.switchNetwork({
          networkChainId: currentUrlNetwork?.chainId,
        });
      } else {
        setIsChanged(true);

        const networkname = networkConfigurations['evm']?.find(
          (net) => net.chainId === network
        );
        let networkNameToSet = networkname?.name?.toString().toLowerCase();
        if (networkNameToSet === 'degen chain') {
          networkNameToSet = 'degen';
        }
        if (networkNameToSet) {
          setCurrentNetwork(network);
          setCurrentNetworkName(networkNameToSet);
        }
        router.push(`/${networkNameToSet}`);
      }
    }
  }, [network, currentNetwork, networkConfigurations, path]);

  const walletAddress = walletContext?.walletAddress;

  return (
    <>
      <Banner />
      <div className='px-5 lg:px-20 pt-12 pb-2 border-b border-white flex justify-between items-center'>
        <Link href='/'>
          <Logo />
        </Link>
        <div className='hidden lg:block'>
          <Menu menuPoints={['about us', 'how it works']} />
        </div>
        <div className='flex flex-col '>
          <div className='flex flex-row  relative items-center gap-x-5'>
            {isClient && isAuthenticated ? (
              <Link
                className='hidden lg:block'
                href={`/${currentNetworkName}/account/${primaryWallet?.address}`}
              >
                my bounties
              </Link>
            ) : null}

            <div className='hidden lg:block'>
              {isClient ? <ConnectWallet /> : null}
            </div>

            <div
              onClick={handleOpenDynamic}
              className={` p-2 w-[40px] h-[40px] wallet  border-[#D1ECFF] border rounded-full backdrop-blur-sm bg-white/30 lg:hidden`}
            >
              <svg
                className='w-full'
                viewBox='-0.5 0 25 25'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path
                  d='M18 2.91992V10.9199'
                  stroke='#ffffff'
                  strokeWidth='1.5'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
                <path
                  d='M21.2008 7.71997L18.0008 10.92L14.8008 7.71997'
                  stroke='#ffffff'
                  strokeWidth='1.5'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
                <path
                  d='M10.58 3.96997H6C4.93913 3.96997 3.92178 4.39146 3.17163 5.1416C2.42149 5.89175 2 6.9091 2 7.96997V17.97C2 19.0308 2.42149 20.0482 3.17163 20.7983C3.92178 21.5485 4.93913 21.97 6 21.97H18C19.0609 21.97 20.0783 21.5485 20.8284 20.7983C21.5786 20.0482 22 19.0308 22 17.97V13.8999'
                  stroke='#ffffff'
                  strokeWidth='1.5'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
                <path
                  d='M2 9.96997H5.37006C6.16571 9.96997 6.92872 10.286 7.49133 10.8486C8.05394 11.4112 8.37006 12.1743 8.37006 12.97C8.37006 13.7656 8.05394 14.5287 7.49133 15.0913C6.92872 15.6539 6.16571 15.97 5.37006 15.97H2'
                  stroke='#ffffff'
                  strokeWidth='1.5'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>
            </div>

            {/* <span className={`${walletAddress ? 'opacity-20' : 'opacity-100'} text-[10px] wallet-address h-[35px] absolute top-[50px] right-0   border-[#D1ECFF] rounded-full border flex items-center justify-center px-5 backdrop-blur-sm bg-white/30  break-normal  `} > {walletAddress ? walletAddress : "connect your wallet" }</span> */}

            <button onClick={handleOpenMenu} className='block lg:hidden'>
              <svg
                width='30'
                height='22'
                viewBox='0 0 30 22'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path
                  fillRule='evenodd'
                  clipRule='evenodd'
                  d='M0 11C0 10.1716 0.671573 9.5 1.5 9.5H28.5C29.3284 9.5 30 10.1716 30 11C30 11.8284 29.3284 12.5 28.5 12.5H1.5C0.671573 12.5 0 11.8284 0 11Z'
                  fill='white'
                />
                <path
                  fillRule='evenodd'
                  clipRule='evenodd'
                  d='M0 2C0 1.17157 0.671573 0.5 1.5 0.5H28.5C29.3284 0.5 30 1.17157 30 2C30 2.82843 29.3284 3.5 28.5 3.5H1.5C0.671573 3.5 0 2.82843 0 2Z'
                  fill='white'
                />
                <path
                  fillRule='evenodd'
                  clipRule='evenodd'
                  d='M9 20C9 19.1716 9.67157 18.5 10.5 18.5H28.5C29.3284 18.5 30 19.1716 30 20C30 20.8284 29.3284 21.5 28.5 21.5H10.5C9.67157 21.5 9 20.8284 9 20Z'
                  fill='white'
                />
              </svg>
            </button>

            <div
              className={`
        ${isOpen ? ' translate-y-[0%] ' : 'translate-y-[-100%]'}   
        fixed h-screen w-screen bg-[#F15E5F] text-white left-0 top-0 flex flex-col justify-between duration-300  transition-all	 z-[40] `}
            >
              <button
                onClick={handleOpenMenu}
                className=' absolute right-5 top-5 '
              >
                close
              </button>
              <div></div>
              <div className='flex items-center justify-center'>
                <Menu menuPoints={['about us', 'how it works']} />
              </div>

              <div className=''>
                <Footer />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        className={`${
          !isShowDynamic ? 'hidden' : ''
        } py-2 lg:hidden border-b border-white flex justify-end px-5   `}
      >
        <ConnectWallet />
      </div>
      {isClient && isAuthenticated ? (
        <div className='py-2 border-b border-white flex justify-end px-5 lg:hidden '>
          <Link href={`/account/${primaryWallet?.address}`}>my bounties</Link>
        </div>
      ) : null}
    </>
  );
};

export default Header;
