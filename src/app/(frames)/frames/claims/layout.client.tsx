'use client';

import '@/styles/globals.css';
import '@/styles/colors.css';
import { TRPCProvider } from '@/trpc/client';
import React from 'react';
import Image from 'next/image';
import { useConnect } from 'wagmi';

function Header() {
  const { connect, connectors } = useConnect();

  return (
    <header className='flex justify-between items-center p-4 bg-blue-400'>
      <div className='flex items-center'>
        <Image src='/Logo_poidh.svg' alt='POIDH Logo' width={80} height={40} />
      </div>
      <button
        onClick={() => connect({ connector: connectors[0] })}
        className='px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg font-medium'
      >
        Connect Wallet
      </button>
    </header>
  );
}

export default function FrameLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body className='bg-blue-300 text-white'>
        <TRPCProvider>
          <Header />
          {children}
        </TRPCProvider>
      </body>
    </html>
  );
}
