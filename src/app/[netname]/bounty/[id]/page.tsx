'use client';
import { useState } from 'react';
import BountyClaims from '@/components/bounty/BountyClaims';
import BountyInfo from '@/components/bounty/BountyInfo';
import NavBarMobile from '@/components/global/NavBarMobile';
import { useScreenSize } from '@/hooks/useScreenSize';
import CreateClaim from '@/components/claims/CreateClaim';
import CommentsSection from '@/components/bounty/CommentsSection';
import Breadcrumbs from '@/components/global/Breadcrumbs';
import BountySuccessModal from '@/components/bounty/BountySuccessModal';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export default function Bounty({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { showSuccessCreationModal?: boolean };
}) {
  const isMobile = useScreenSize();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isHowItWorksModalOpen, setIsHowItWorksModalOpen] = useState(false);
  const [isSuccessCreationModalOpen, setIsSuccessCreationModalOpen] = useState(
    !!searchParams?.showSuccessCreationModal
  );
  const currentSearchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <>
      <BountySuccessModal
        open={isSuccessCreationModalOpen}
        bountyId={Number(params.id)}
        onClose={() => {
          setIsSuccessCreationModalOpen(false);
          const params = new URLSearchParams(currentSearchParams.toString());
          params.delete('showSuccessCreationModal');
          router.replace(
            params.toString() ? `${pathname}?${params.toString()}` : pathname,
            {
              scroll: false,
            }
          );
        }}
      />
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
