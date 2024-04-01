import ContextProvider from '@/app/context/ContextProvider';
import * as React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Content from '@/components/layout/ContentHome';
const AccountInfo = dynamic(() => import('@/components/account/AccountInfo'), { ssr: false });
import Footer from '@/components/layout/Footer';

const Account = () => {
  return (
    <ContextProvider>
      <Header />
      <div className='container mx-auto px-5 lg:px-0 pt-16'>
        <AccountInfo />
      </div>
      <Footer />
    </ContextProvider>
  );
};

export default Account;
