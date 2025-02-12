'use client';
import Link from 'next/link';
import React, { useState } from 'react';

import { useGetChain } from '@/hooks/useGetChain';
import SlideOverMenu from '@/components/global/SlideOverMenu';
import {
  ArbitrumIcon,
  BaseIcon,
  DegenIcon,
  ExpandMoreIcon,
  MenuIcon,
  WalletIcon,
} from '@/components/global/Icons';
import { Button, Drawer, Menu, MenuItem } from '@mui/material';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { cn } from '@/utils';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Logo from '../global/Logo';

const Header = () => {
  const chain = useGetChain();
  const [isOpen, setIsOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const router = useRouter();
  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  const networks = [
    { href: '/arbitrum', Icon: ArbitrumIcon, name: 'arbitrum' },
    { href: '/base', Icon: BaseIcon, name: 'base' },
    { href: '/degen', Icon: DegenIcon, name: 'degen' },
  ];

  return (
    <>
      <Drawer
        open={isOpen}
        onClose={(cur) => setIsOpen(!cur)}
        PaperProps={{
          className: 'w-60 bg-[#F15E5F]',
        }}
      >
        <SlideOverMenu />
      </Drawer>
      <div className='flex justify-between items-center h-[4.5rem] px-4 lg:px-20 border-b border-white'>
        <div className='flex'>
          <button
            onClick={() => setIsOpen(true)}
            className='mr-2 hover:text-[#F15E5F]'
          >
            <MenuIcon width={30} height={30} />
          </button>
          <Link href={`/`}>
            <Logo />
          </Link>
        </div>
        <div className='flex items-center'>
          <Button
            id='basic-button'
            aria-controls={open ? 'basic-menu' : undefined}
            aria-haspopup='true'
            aria-expanded={open ? 'true' : undefined}
            onClick={handleClick}
            className='border-[#D1ECFF] border rounded-lg backdrop-blur-sm bg-white/30 p-2 mr-2 hover:bg-white/20'
          >
            {networks
              .find(({ name }) => name === chain.slug)
              ?.Icon({
                width: 24,
                height: 24,
              })}{' '}
            <ExpandMoreIcon />
          </Button>
          <Menu
            id='basic-menu'
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            MenuListProps={{
              'aria-labelledby': 'basic-button',
            }}
            sx={{
              '& .MuiPaper-root': {
                backdropFilter: 'blur(8px)',
                background:
                  'linear-gradient(to top, rgba(209, 236, 255, 0.2) 10%, rgba(209, 236, 255, 0.1) 30%, rgba(209, 236, 255, 0.05) 50%)',
                color: '#FFF',
                marginTop: '0.25rem',
                fontFamily: 'GeistMono-Regular',
                fontSize: '0.875rem',
              },
              '& .MuiMenuItem-root': {
                fontFamily: 'GeistMono-Regular',
                fontSize: '0.875rem',
              },
              '& .MuiList-root': {
                gap: '1.25rem',
              },
            }}
          >
            {networks.map(({ href, Icon, name }) => (
              <MenuItem
                key={href}
                className={cn('mx-1')}
                onClick={() => router.push(href)}
              >
                <Icon width={24} height={24} /> <p className='ml-4'>{name}</p>
              </MenuItem>
            ))}
          </Menu>
          <ConnectWalletButton />
        </div>
      </div>
    </>
  );
};

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
                          <WalletIcon width={33} height={33} />
                          <div className='absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full md:hidden' />
                        </>
                      )}
                    </div>
                    <span className='hidden md:block'>
                      {account.ensName || account.displayName}
                    </span>
                    <ExpandMoreIcon height={12} width={12} />
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

export default Header;
