'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { TwitterXIcon } from '@/components/global/Icons';
import {
  getDisplayUsername,
  shareToFarcaster,
  shareToTwitter,
} from '@/utils/share';
import { trpc } from '@/trpc/client';
import DisplayAddress from '@/components/global/DisplayAddress';
import { useChainInfo } from '@/hooks/useGetChain';
import { uploadFile } from '@/utils/pinata';
import { UserData } from '@/utils/types';

export default function ClaimSuccessModal({
  open,
  onClose,
  claimImage,
  claimTitle,
  bountyId,
  claimIssuer,
}: {
  open: boolean;
  onClose: () => void;
  claimImage: string;
  claimTitle: string;
  bountyId: string;
  claimIssuer: string;
}) {
  const router = useRouter();
  const chain = useChainInfo();
  const [shareOpen, setShareOpen] = useState(false);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const shareBtnRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const bounty = trpc.bounties.fetch.useQuery(
    {
      id: Number(bountyId),
      chainId: chain.id,
    },
    {
      enabled: !!open && !!bountyId,
    }
  );
  const usersQuery = trpc.neynar.usersData.useQuery(
    {
      addresses: bounty.data?.issuer
        ? [bounty.data?.issuer, claimIssuer]
        : [claimIssuer],
    },
    {
      enabled: !!open && !!bounty.data && !!claimIssuer,
    }
  );

  const bountyIssuerData = usersQuery.data?.find(
    (user) =>
      bounty.data?.issuer.toLocaleLowerCase() ===
      user.address.toLocaleLowerCase()
  );
  const claimIssuerData = usersQuery.data?.find(
    (user) =>
      claimIssuer.toLocaleLowerCase() === user.address.toLocaleLowerCase()
  );

  useEffect(() => {
    function handleDocClick(e: MouseEvent) {
      if (
        !e.target ||
        dropdownRef.current === e.target ||
        dropdownRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setShareOpen(false);
    }

    if (shareOpen) {
      document.addEventListener('mousedown', handleDocClick);
    }
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, [shareOpen]);

  const handleShareTwitter = async () => {
    const bountyIssuerUsername = await getDisplayUsername(
      bountyIssuerData as UserData,
      'twitter'
    );

    const text = `I just submitted a claim on ${bountyIssuerUsername}'s poidh bounty ${bounty.data?.title} 📸`;
    shareToTwitter(text);
  };

  const handleShareFarcaster = async () => {
    const bountyIssuerUsername = await getDisplayUsername(
      bountyIssuerData as UserData,
      'farcaster'
    );
    const claimIssuerUsername = await getDisplayUsername(
      claimIssuerData as UserData,
      'farcaster'
    );
    const text = `I just submitted a claim on ${bountyIssuerUsername}'s poidh bounty ${bounty.data?.title} 📸`;

    setIsGeneratingCard(true);
    try {
      const cardUrl = new URL(
        '/api/generate-claim-card',
        window.location.origin
      );
      cardUrl.searchParams.set('image', claimImage);
      cardUrl.searchParams.set('title', claimTitle.slice(0, 30));
      cardUrl.searchParams.set('issuer', claimIssuerUsername);

      const claimIssuerPfp = claimIssuerData?.pfp_url;
      if (claimIssuerPfp) {
        cardUrl.searchParams.set('pfp', claimIssuerPfp);
      }

      const response = await fetch(cardUrl.toString());
      if (!response.ok) {
        throw new Error('Failed to generate claim card');
      }

      const imageBlob = await response.blob();
      const uploadResult = await uploadFile(imageBlob);

      if (!uploadResult?.IpfsHash) {
        throw new Error('Failed to upload to Pinata');
      }

      await shareToFarcaster({
        text,
        embedImage: `https://gateway.pinata.cloud/ipfs/${uploadResult.IpfsHash}`,
      });
    } catch (error) {
      console.error('Error sharing to Farcaster:', error);
      await shareToFarcaster({ text, embedImage: claimImage });
    } finally {
      setIsGeneratingCard(false);
    }
  };

  if (!open) return;

  return (
    <div
      className='fixed inset-0 z-[1400] bg-black/30 flex items-center justify-center p-4'
      onClick={onClose}
    >
      <div
        className='relative w-[calc(100vw-2rem)] sm:w-[520px] max-w-[520px] bg-poidhBlue/90 rounded-xl p-6 border border-[#D1ECFF]'
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className='absolute top-4 right-4 text-white hover:opacity-70 transition-opacity'
          aria-label='Close'
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='24'
            height='24'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <line x1='18' y1='6' x2='6' y2='18'></line>
            <line x1='6' y1='6' x2='18' y2='18'></line>
          </svg>
        </button>
        <h3 className='font-mono text-xl text-white font-bold text-center mt-8'>
          congratulations! your claim has been submitted:
        </h3>

        <div className='mt-4 bg-poidhRed rounded-lg p-4'>
          <div className='w-full aspect-square rounded-lg overflow-hidden bg-white/10 relative'>
            {claimImage ? (
              <Image
                src={claimImage}
                alt='Claim preview'
                fill
                className='object-cover'
              />
            ) : (
              <div className='w-full h-48 bg-white/5 flex items-center justify-center text-white/60'>
                no image
              </div>
            )}
          </div>

          <div className='mt-3 text-white text-sm leading-relaxed'>
            <div className='font-semibold text-lg'>{claimTitle}</div>
            <div className='mt-2 opacity-90 flex items-center gap-2'>
              <span>issuer:</span>
              <DisplayAddress address={claimIssuer.toLowerCase()} />
            </div>
          </div>
        </div>

        <p className='mt-4 text-white/80 text-sm'>
          please contact the bounty creator if you have any questions on the
          claim selection process
        </p>

        <div className='mt-4 flex flex-col gap-3'>
          <div className='flex gap-3 relative items-start'>
            <button
              ref={shareBtnRef}
              onClick={() => setShareOpen((v) => !v)}
              className='basis-1/3 py-3 rounded-lg bg-poidhRed text-white font-medium hover:brightness-110 transition'
              aria-expanded={shareOpen}
              aria-haspopup='menu'
            >
              share
            </button>
            <button
              onClick={() => router.push(`/account/${claimIssuer}`)}
              className='basis-2/3 py-3 rounded-lg bg-[#7fb7ee] text-white font-semibold shadow-md hover:brightness-105 hover:scale-[1.01] transition-transform'
            >
              view your profile
            </button>

            {shareOpen && (
              <div
                ref={dropdownRef}
                role='menu'
                aria-label='share menu'
                className='absolute left-0 bottom-[calc(100%+2px)] z-40 p-2 rounded-xl shadow-lg min-w-[200px] ring-1 ring-white/5 bg-gradient-to-br from-[#4aa0ff]/80 via-[#3fb0e9]/70 to-[#2f8fd9]/60 backdrop-blur-md border border-white/10'
              >
                <div className='flex flex-col font-mono text-sm text-white'>
                  <button
                    onClick={handleShareFarcaster}
                    disabled={isGeneratingCard}
                    className='w-full text-left px-4 py-2 rounded-md hover:bg-white/5 flex items-center gap-3 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    <img
                      src='/images/farcaster_arch.svg'
                      alt='farcaster'
                      className='w-5 h-5 filter brightness-200'
                    />
                    <span>
                      {isGeneratingCard ? 'generating...' : 'farcaster'}
                    </span>
                  </button>
                  <button
                    onClick={handleShareTwitter}
                    className='w-full text-left px-4 py-2 rounded-md hover:bg-white/5 flex items-center gap-3 text-white'
                  >
                    <TwitterXIcon width={18} height={18} />
                    <span className='lowercase'>x</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
