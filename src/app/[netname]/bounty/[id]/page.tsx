'use client';

import { useState, useEffect } from 'react';
import BountyClaims from '@/components/bounty/BountyClaims';
import BountyInfo from '@/components/bounty/BountyInfo';
import Navbar from '@/components/global/Navbar';
import CommentsSection from '@/components/bounty/CommentsSection';
import BountySuccessModal from '@/components/bounty/BountySuccessModal';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useChainInfo } from '@/hooks/useChainInfo';
import { ChainId } from '@/utils/types';
import { ArrowIcon } from '@/components/global/Icons';

export default function Bounty({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { showSuccessCreationModal?: string };
}) {
  const { id: bountyId } = params;
  const { showSuccessCreationModal } = searchParams;

  const chain = useChainInfo();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isHowItWorksModalOpen, setIsHowItWorksModalOpen] = useState(false);
  const [isSuccessCreationModalOpen, setIsSuccessCreationModalOpen] = useState(
    Boolean(showSuccessCreationModal)
  );
  const currentSearchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // Save the referrer tab when navigating to this bounty page
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Get the tab from the referring URL or sessionStorage
      const referrer = document.referrer;
      if (referrer) {
        try {
          const url = new URL(referrer);
          const tab = url.searchParams.get('tab');
          if (tab && ['open', 'progress', 'past'].includes(tab)) {
            sessionStorage.setItem('bountyListTab', tab);
            const sort = url.searchParams.get('sort') || 'value';
            sessionStorage.setItem('bountyListSort', sort);
          }
        } catch (e) {
          // Invalid referrer URL, ignore
        }
      }
    }
  }, []);

  const handleBack = () => {
    // Try to restore the correct tab when going back
    if (typeof window !== 'undefined') {
      const savedTab = sessionStorage.getItem('bountyListTab');
      const savedSort = sessionStorage.getItem('bountyListSort') || 'value';
      
      if (savedTab) {
        sessionStorage.removeItem('bountyListTab');
        sessionStorage.removeItem('bountyListSort');
        router.push(`/?tab=${savedTab}&sort=${savedSort}`, { scroll: false });
        return;
      }
    }

    router.push('/', { scroll: false });
  };

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
        <button
          type='button'
          onClick={handleBack}
          className='pt-4 flex items-center gap-2'
        >
          <div className='-scale-x-100'>
            <ArrowIcon />
          </div>
          <span className='cursor-pointer hover:underline'>back</span>
        </button>
        <BountyInfo
          isShareModalOpen={isShareModalOpen}
          isHowItWorksModalOpen={isHowItWorksModalOpen}
          bountyId={Number(params.id)}
          onShareModalStateChange={setIsShareModalOpen}
          onHowItWorksModalStateChange={setIsHowItWorksModalOpen}
        />
        <BountyClaims bountyId={Number(params.id)} />
        <CommentsSection
          chainId={chain.id as ChainId}
          bountyId={Number(bountyId)}
        />
      </div>
      {!isShareModalOpen && !isHowItWorksModalOpen && (
        <Navbar type='claim' bountyId={params.id} />
      )}
      <div className='h-80' />
    </>
  );
}
