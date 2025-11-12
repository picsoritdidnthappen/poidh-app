'use client';
import { useState } from 'react';
import BountyClaims from '@/components/bounty/BountyClaims';
import BountyInfo from '@/components/bounty/BountyInfo';
import NavBarMobile from '@/components/global/NavBarMobile';
import { useScreenSize } from '@/hooks/useScreenSize';
import CreateClaim from '@/components/claims/CreateClaim';
import CommentsSection from '@/components/bounty/CommentsSection';
import Breadcrumbs from '@/components/global/Breadcrumbs';

export default function Bounty({ params }: { params: { id: string } }) {
  const isMobile = useScreenSize();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isHowItWorksModalOpen, setIsHowItWorksModalOpen] = useState(false);

  return (
    <>
      <div className='px-5 lg:px-20'>
        <div className='pt-4'>
          <Breadcrumbs />
        </div>
        <BountyInfo
          isShareModalOpen={isShareModalOpen}
          isHowItWorksModalOpen={isHowItWorksModalOpen}
          bountyId={params.id}
          onShareModalStateChange={setIsShareModalOpen}
          onHowItWorksModalStateChange={setIsHowItWorksModalOpen}
        />
        <BountyClaims bountyId={params.id} />
        <CommentsSection />
      </div>
      {!isShareModalOpen &&
        !isHowItWorksModalOpen &&
        (isMobile ? (
          <NavBarMobile type='claim' bountyId={params.id} />
        ) : (
          <CreateClaim bountyId={params.id} />
        ))}
      <div className='h-80' />
    </>
  );
}
