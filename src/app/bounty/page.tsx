'use client';

import ContextProvider from '@/app/context/ContextProvider';
import * as React from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Content from '@/components/layout/Content';
import BountyInfo from '@/components/bounty/BountyInfo';
import BountyProofs from '@/components/bounty/BountyProofs';
import Footer from '@/components/layout/Footer';



const Bounty = () => {


  return (
  <ContextProvider>
    <Header/>
    <section className='px-5 lg:px-20'>
    <BountyInfo/>
    <BountyProofs/>
    </section>
    <Footer/>

   
   
   

  </ContextProvider>
  );
};

export default Bounty;