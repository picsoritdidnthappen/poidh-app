'use client';

import * as React from 'react';
import { ToastContainer } from 'react-toastify';

import 'react-toastify/dist/ReactToastify.css';

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
