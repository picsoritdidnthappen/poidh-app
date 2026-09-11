'use client';

import { useState } from 'react';
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

  const isDegen = pathname.startsWith('/degen/');
  const isKickflipWorldRecordBounty = isDegen && bountyId === '1167';

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }

    router.push('/', { scroll: false });
  };

  /*
   * Degen Chain has been retired and its historical bounty data is
   * currently being restored.
   *
   * Intercept legacy Degen bounty pages here so components that depend
   * on the live/indexed bounty data do not render and return an error.
   */
  if (isDegen) {
    return (
      <>
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

          <div className='max-w-3xl mx-auto pt-16 pb-20'>
            {isKickflipWorldRecordBounty ? (
              <>
                <div className='text-sm opacity-60 mb-4'>
                  historical Degen Chain bounty #{bountyId}
                </div>

                <h1 className='text-3xl lg:text-5xl font-bold mb-6'>
                  Kickflip World Record Bounty
                </h1>

                <p className='text-lg leading-relaxed mb-6'>
                  This is a historical poidh bounty originally created on
                  Degen Chain. Degen Chain has since been retired, and poidh is
                  currently restoring its legacy bounty data.
                </p>

                <p className='text-lg leading-relaxed mb-8'>
                  This bounty helped document Dave Bachinsky&apos;s kickflip
                  world record. We&apos;re preserving this URL while the
                  original bounty and claim data is restored.
                </p>

                <a
                  href='https://words.poidh.xyz/degen-haberdashery-dave-bachinsky-kickflip-world-record'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='underline font-semibold'
                >
                  read the full story of the Degen Chain kickflip world record
                  →
                </a>
              </>
            ) : (
              <>
                <div className='text-sm opacity-60 mb-4'>
                  historical Degen Chain bounty #{bountyId}
                </div>

                <h1 className='text-3xl lg:text-5xl font-bold mb-6'>
                  Degen Chain bounty archive
                </h1>

                <p className='text-lg leading-relaxed mb-6'>
                  Degen Chain has been retired. poidh is currently restoring
                  legacy pages for historical Degen Chain bounties.
                </p>

                <p className='text-lg leading-relaxed'>
                  Your historical poidh activity and records from Degen Chain
                  will remain part of your poidh history. Some legacy bounty
                  pages may be temporarily unavailable while we complete the
                  recovery process.
                </p>
              </>
            )}
          </div>
        </div>

        <div className='h-80' />
      </>
    );
  }

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
