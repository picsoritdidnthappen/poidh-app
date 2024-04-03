'use client'

import ContextProvider from '@/app/context/ContextProvider';
import * as React from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/layout/Header';
const AccountInfo = dynamic(() => import('@/components/account/AccountInfo'), { ssr: false });
import Footer from '@/components/layout/Footer';
import WalletProvider from '@/app/context/WalletProvider';



const Account = () => {
  return (
    <ContextProvider>
      <WalletProvider>
      <Header />
      <div className='container mx-auto px-5 lg:px-0 pt-16'>
        <AccountInfo />
      </div>
      <Footer />
      </WalletProvider>
    </ContextProvider>
  );
};

export default Account;
