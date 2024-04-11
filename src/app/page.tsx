'use client';

import * as React from 'react';

import ContentHome from '@/components/layout/ContentHome';
import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import CreateBounty from '@/components/ui/CreateBounty';

import ContextProvider from '@/app/context/ContextProvider';
import WalletProvider from '@/app/context/WalletProvider';



const Home = () => {

  
  return (
      <ContextProvider>
        <WalletProvider>
        
        <Header />
        <ContentHome/>
        <div className='fixed bottom-0 w-full'>
        <CreateBounty />
        </div>
         <Footer />
         </WalletProvider>
      </ContextProvider>
  );
};

export default Home;
