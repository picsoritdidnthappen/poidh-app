'use client';

import * as React from 'react';
import { ToastContainer } from 'react-toastify';

import 'react-toastify/dist/ReactToastify.css';

import ContentBounty from '@/components/layout/ContentBounty';
import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';

import ContextProvider from '@/app/context/ContextProvider';
import WalletProvider from '@/app/context/WalletProvider';

const Bounty = () => {
  return (
    <ContextProvider>
      <WalletProvider>
        <Header />
        <section className='px-5 lg:px-20'>
          <ContentBounty />
        </section>
        <Footer />
      </WalletProvider>
      <ToastContainer />
    </ContextProvider>
  );
};

export default Bounty;
