import React from 'react';

import '@/styles/globals.css';
import '@/styles/colors.css';

import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';

import ContextProvider from '@/app/context/ContextProvider';
import WalletProvider from '@/app/context/WalletProvider';

export const metadata = {
  title: "poidh - pics or it didn't happen",
  description:
    "poidh - pics or it didn't happen - fully onchain bounties + collectible NFTs - start your collection today on Arbitrum, Base, or Degen Chain",
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html>
    <head>
      <link rel='canonical' href='https://poidh.xyz/' />
    </head>
    <body className='bg-blue-300 text-white'>
      <ContextProvider>
        <WalletProvider>
          <Header />
          {children}
          <Footer />
        </WalletProvider>
      </ContextProvider>
    </body>
  </html>
);

export default RootLayout;
