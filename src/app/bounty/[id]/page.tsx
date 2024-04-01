'use client';

import ContextProvider from '@/app/context/ContextProvider';
import * as React from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Content from '@/components/layout/ContentHome';
import BountyInfo from '@/components/bounty/BountyInfo';
import BountyProofs from '@/components/bounty/BountyProofs';
import Footer from '@/components/layout/Footer';
import  WalletProvider  from '@/app/context/WalletProvider';
import { usePathname } from 'next/navigation';
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


