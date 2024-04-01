'use client';

import ContextProvider from '@/app/context/ContextProvider';
import * as React from 'react';
import Header from '@/components/layout/Header';
import ContentHome from '@/components/layout/ContentHome';
import CreateBounty from '@/components/ui/CreateBounty';
import Footer from '@/components/layout/Footer';


import { Suspense } from 'react';
import  { ReactNode, useEffect, useState } from 'react';

import ToggleButton from '@/components/ui/ToggleButton';
import BountyList from '@/components/ui/BountyList';

import WalletProvider from '@/app/context/WalletProvider';



const Home = () => {

  
  return (
      <ContextProvider>
        <WalletProvider>
        <Header />
        <div className="pb-44">

          <ContentHome/>
          {/* <ToggleButton option1={"Open to Claim"} option2={"Past Bounty"}/>  */}
          {/* <BountyList /> */}
        </div>
        <div className='fixed bottom-0 w-full'>
          <CreateBounty />
        </div>
         <Footer />
         </WalletProvider>
      </ContextProvider>
  );
};

export default Home;
