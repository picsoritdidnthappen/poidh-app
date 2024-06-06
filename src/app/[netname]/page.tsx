'use client';

import * as React from 'react';

import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';

import ContentHome from '@/components/layout/ContentHome';
import CreateBounty from '@/components/ui/CreateBounty';

const Home = () => {
  return (
    <>
      <ContentHome />
      <CreateBounty />
      <ToastContainer />
    </>
  );
};

export default Home;
