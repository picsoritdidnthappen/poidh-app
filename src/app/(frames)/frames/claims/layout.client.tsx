'use client';

import '@/styles/globals.css';
import '@/styles/colors.css';
import { TRPCProvider } from '@/trpc/client';
import { WagmiConfig, createConfig, http } from 'wagmi';
import { arbitrum, base, degen } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';
import { farcasterFrame } from '@farcaster/frame-wagmi-connector';
import Image from 'next/image';
import { useConnect } from 'wagmi';

const config = createConfig({
  chains: [degen, arbitrum, base],
  transports: {
    [degen.id]: http(
      'https://degen-mainnet.g.alchemy.com/v2/u14hNDLOC4WItmevbcUWItEg6KThN5W0'
    ),
    [arbitrum.id]: http(
      'https://arb-mainnet.g.alchemy.com/v2/XCJ_kTDkVWrwvQ8vbOOXNxKvKyN30Lu1'
    ),
    [base.id]: http(
      'https://base-mainnet.g.alchemy.com/v2/u14hNDLOC4WItmevbcUWItEg6KThN5W0'
    ),
  },
  connectors: [
    farcasterFrame(),
    walletConnect({ projectId: '784d6347a43d3f6e89f58b177f1b27f2' }),
    injected(),
  ],
});

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
        <WagmiConfig config={config}>
          <TRPCProvider>
            <Header />
            {children}
          </TRPCProvider>
        </WagmiConfig>
      </body>
    </html>
  );
}
