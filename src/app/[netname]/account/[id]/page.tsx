'use client';

import dynamic from 'next/dynamic';
import * as React from 'react';
import { ToastContainer } from 'react-toastify';

const AccountInfo = dynamic(() => import('@/components/account/AccountInfo'), {
  ssr: false,
});

const Account = () => {
  return (
    <>
      <div className='container mx-auto px-5 lg:px-0 pt-16'>
        <AccountInfo />
        <ToastContainer />
      </div>
    </>
  );
};

export default Account;
