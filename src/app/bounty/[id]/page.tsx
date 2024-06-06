'use client';

import * as React from 'react';

import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';

import ContentBounty from '@/components/layout/ContentBounty';

const Bounty = () => {
  return (
    <>
      <section className='px-5 lg:px-20'>
        <ContentBounty />
        <ToastContainer />
      </section>
    </>
  );
};

export default Bounty;
