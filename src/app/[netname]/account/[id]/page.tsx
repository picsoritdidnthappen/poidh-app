'use client';

import dynamic from 'next/dynamic';
import * as React from 'react';

const AccountInfo = dynamic(() => import('@/components/account/AccountInfo'), {
  ssr: false,
});
import { usePathname } from 'next/navigation';

const Account = () => {
  const pathname = usePathname();
  const accountLink = pathname.split('/').pop() || '';

  console.log(accountLink);

  return (
    <>
      <div className='container mx-auto px-5 lg:px-0 pt-16'>
        <AccountInfo />
      </div>
    </>
  );
};

export default Account;
