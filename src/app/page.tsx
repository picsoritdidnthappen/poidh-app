'use client';

import ContextProvider from '@/app/context/ContextProvider';
import * as React from 'react';
import Header from '@/components/layout/Header';
import ContentHome from '@/components/layout/ContentHome';
import CreateBounty from '@/components/ui/CreateBounty';
import Footer from '@/components/layout/Footer';


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
