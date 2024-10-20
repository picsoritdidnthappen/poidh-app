'use client';

import React from 'react';
import { ToastContainer } from 'react-toastify';

import 'react-toastify/dist/ReactToastify.css';

import ContentHome from '@/components/new/layout/ContentHome';
import CreateBounty from '@/components/new/ui/CreateBounty';

export default function Home() {
  return (
    <>
      <ContentHome />
      <CreateBounty />
      <ToastContainer />
    </>
  );
}
