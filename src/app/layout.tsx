import React from 'react';

import '@/styles/globals.css';
import '@/styles/colors.css';

import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';

import ContextProvider from '@/app/context/ContextProvider';
import WalletProvider from '@/app/context/WalletProvider';

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html>
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
