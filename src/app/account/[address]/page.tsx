'use client';

import Navbar from '@/components/global/Navbar';
import dynamic from 'next/dynamic';

const AccountInfo = dynamic(() => import('@/components/account/AccountInfo'), {
  ssr: false,
});

export default function Account({ params }: { params: { address: string } }) {
  return (
    <>
      <AccountInfo address={params.address.toLocaleLowerCase()} />
      <Navbar type='bounty' />
    </>
  );
}
