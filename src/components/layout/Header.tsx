'use client';

import Link from 'next/link';
import { useState } from 'react';
import SlideOverMenu from '@/components/global/SlideOverMenu';
import {
  ExpandMoreIcon,
  MenuIcon,
  MagnifyingGlassIcon2,
  UserIcon,
  WalletIcon,
} from '@/components/global/Icons';
import { Drawer } from '@mui/material';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Image from 'next/image';
import Logo from '../global/Logo';
import { useAccount } from 'wagmi';

export default function Header() {
  const account = useAccount();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Drawer
        open={isOpen}
        onClose={(cur) => setIsOpen(!cur)}
        PaperProps={{
          className: 'w-60 bg-poidhRed',
        }}
      >
        <SlideOverMenu />
      </Drawer>
      <div className='flex justify-between items-center h-[4.5rem] px-4 lg:px-20 border-b border-white'>
        <div className='flex'>
          <button
            onClick={() => setIsOpen(true)}
            className='mr-2 hover:text-poidhRed'
          >
            <MenuIcon size={30} />
          </button>
          <Link href='/'>
            <Logo />
          </Link>
        </div>
        <div className='flex items-center'>
          <Link
            href='/explore'
            className='rounded-lg backdrop-blur-sm bg-white/30 p-2 mr-2 hover:bg-white/20'
            aria-label='Explore'
          >
            <MagnifyingGlassIcon2 />
          </Link>
          {account.address && (
            <Link
              href={`/account/${account.address}`}
              className='rounded-lg backdrop-blur-sm bg-white/30 p-2 mr-2 hover:bg-white/20'
            >
              <UserIcon />
            </Link>
          )}
          <ConnectWalletButton />
        </div>
      </div>
    </>
  );
}

function ConnectWalletButton() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === 'authenticated');
        return (
          <>
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    className='border-[#D1ECFF] rounded-lg backdrop-blur-sm bg-white/30 p-2 hover:bg-white/20'
                  >
                    connect
                  </button>
                );
              }
              return (
                <div className='flex gap-2'>
                  <button
                    onClick={openAccountModal}
                    className='border-[#D1ECFF] rounded-lg backdrop-blur-sm bg-white/30 p-1 hover:bg-white/20 flex items-center gap-1 relative'
                  >
                    <div className='relative'>
                      {account.ensAvatar ? (
                        <Image
                          src={account.ensAvatar}
                          className='rounded-lg'
                          alt='User Avatar'
                          width={33}
                          height={33}
                        />
                      ) : (
                        <>
                          <WalletIcon size={33} />
                          <div className='absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full md:hidden' />
                        </>
                      )}
                    </div>
                    <span className='hidden md:block'>
                      {account.ensName || account.displayName}
                    </span>
                    <ExpandMoreIcon size={12} />
                  </button>
                </div>
              );
            })()}
          </>
        );
      }}
    </ConnectButton.Custom>
  );
}
