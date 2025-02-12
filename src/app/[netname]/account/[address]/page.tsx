'use client';

import dynamic from 'next/dynamic';
import * as React from 'react';

const AccountInfo = dynamic(() => import('@/components/account/AccountInfo'), {
  ssr: false,
});

export default function Account({ params }: { params: { address: string } }) {
  return <AccountInfo address={params.address.toLocaleLowerCase()} />;
}
