import React from 'react';
import Image from 'next/image';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { ArbitrumIcon, BaseIcon, DegenIcon } from '@/components/global/Icons';

interface HeaderProps {
  chainId: string;
}

const Header: React.FC<HeaderProps> = ({ chainId }) => {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const networks = [
    { href: '/arbitrum', Icon: ArbitrumIcon, name: 'arbitrum' },
    { href: '/base', Icon: BaseIcon, name: 'base' },
    { href: '/degen', Icon: DegenIcon, name: 'degen' },
  ];

  const handleConnection = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect({
        connector: connectors[0],
        chainId: parseInt(chainId),
      });
    }
  };

  const displayAddress = address
    ? `${address.slice(0, 5)}...${address.slice(-4)}`
    : '';

  return (
    <header className='flex justify-between items-center p-4 bg-[#12AAFF]'>
      <div className='flex items-center'>
        <Image src='/Logo_poidh.svg' alt='POIDH Logo' width={80} height={40} />
      </div>

      <div className='flex items-center gap-2'>
        {isConnected && (
          <div className='flex items-center backdrop-blur-sm bg-white/20 rounded-xl px-4 py-2'>
            {networks
              .find(({ name }) => name === chainId.toLowerCase())
              ?.Icon({
                width: 24,
                height: 24,
              })}
          </div>
        )}
        <button
          onClick={handleConnection}
          className='flex backdrop-blur-sm bg-white/20 text-bold gap-x-5 border border-white/40 rounded-xl px-5 py-2 hover:bg-white/30 transition-all duration-200 text-white'
        >
          {isConnected ? displayAddress : 'Connect Wallet'}
        </button>
      </div>
    </header>
  );
};

export default Header;
