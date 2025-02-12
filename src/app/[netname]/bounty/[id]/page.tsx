'use client';
import React from 'react';
import BountyClaims from '@/components/bounty/BountyClaims';
import BountyInfo from '@/components/bounty/BountyInfo';
import NavBarMobile from '@/components/global/NavBarMobile';
import { useScreenSize } from '@/hooks/useScreenSize';
import CreateClaim from '@/components/claims/CreateClaim';

export default function Bounty({ params }: { params: { id: string } }) {
  const isMobile = useScreenSize();

  return (
    <>
      <div className='px-5 lg:px-20'>
        <BountyInfo bountyId={params.id} />
        <BountyClaims bountyId={params.id} />
      </div>
      {isMobile ? (
        <NavBarMobile type='claim' bountyId={params.id} />
      ) : (
        <CreateClaim bountyId={params.id} />
      )}
      <div className='h-80' />
    </>
  );
}
