'use client';

import * as React from 'react';
import { ToastContainer } from 'react-toastify';

import 'react-toastify/dist/ReactToastify.css';

import ContentBounty from '@/components/new/layout/ContentBounty';

export default function Bounty({ params }: { params: { id: string } }) {
  return (
    <section className='px-5 lg:px-20'>
      <ContentBounty bountyId={params.id} />
      <ToastContainer />
    </section>
  );
}
