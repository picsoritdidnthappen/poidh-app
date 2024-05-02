'use client';

import * as React from 'react';

import ContentHome from '@/components/layout/ContentHome';
import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import CreateBounty from '@/components/ui/CreateBounty';

import ContextProvider from '@/app/context/ContextProvider';
import WalletProvider from '@/app/context/WalletProvider';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';



const Home = () => {
  return (
      <ContextProvider>
        <WalletProvider>
        <Header />
        <ContentHome/>
        <CreateBounty />
         <Footer />
         </WalletProvider>
         <ToastContainer />

      </ContextProvider>
  );
};

export default Home;
