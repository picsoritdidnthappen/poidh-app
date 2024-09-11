'use client';

import React from 'react';
import { ToastContainer } from 'react-toastify';

import 'react-toastify/dist/ReactToastify.css';

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
