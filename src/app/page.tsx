'use client';

import ContextProvider from '@/app/context/ContextProvider';
import * as React from 'react';
import Header from '@/components/layout/Header';
import Content from '@/components/layout/Content';
import CreateBounty from '@/components/ui/CreateBounty';
import Footer from '@/components/layout/Footer';


import { Suspense } from 'react';
import ToggleButton from '@/components/ui/ToggleButton';
import BountyList from '@/components/ui/BountyList';

import WalletProvider from '@/app/context/WalletProvider';


const Home = () => {

  
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ContextProvider>
        <WalletProvider>
        <Header />
        <div className="pb-44">
          <ToggleButton option1={"Open to Claim"} option2={"Past Bounty"}/> 
          <BountyList />
        </div>
        <div className='fixed bottom-0 w-full'>
          <CreateBounty />
        </div>
         <Footer />
         </WalletProvider>
      </ContextProvider>
    </Suspense>
  );
};

export default Home;
