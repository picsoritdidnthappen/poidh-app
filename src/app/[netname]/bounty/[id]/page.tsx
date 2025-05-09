'use client';
import { usePathname } from 'next/navigation';
import React from 'react';
import BountyClaims from '@/components/bounty/BountyClaims';
import BountyInfo from '@/components/bounty/BountyInfo';
import NavBarMobile from '@/components/global/NavBarMobile';
import { useScreenSize } from '@/hooks/useScreenSize';
import CreateClaim from '@/components/claims/CreateClaim';
import CommentsSection from '@/components/bounty/CommentsSection';
import Breadcrumbs from '@/components/global/Breadcrumbs';

export default function Bounty({ params }: { params: { id: string } }) {
  const isMobile = useScreenSize();
  const pathname = usePathname();

  return (
    <>
      <div className='px-5 lg:px-20'>
        <div className='py-4'>
          <Breadcrumbs />
        </div>
        <BountyInfo bountyId={params.id} />
        <BountyClaims bountyId={params.id} />
        <CommentsSection url={`https://poidh.xyz${pathname}`} />
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
