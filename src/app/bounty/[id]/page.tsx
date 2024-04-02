'use client';

import ContextProvider from '@/app/context/ContextProvider';
import * as React from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import  WalletProvider  from '@/app/context/WalletProvider';
import ContentBounty from '@/components/layout/ContentBounty';



const Bounty = () => {



  return (
  <ContextProvider>
    <WalletProvider>
    <Header/>
    <section className='px-5 lg:px-20'>
    <ContentBounty/>
    </section>
    <Footer/>
    </WalletProvider>
  </ContextProvider>
  );
};

export default Bounty;


