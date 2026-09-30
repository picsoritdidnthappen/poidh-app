'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { formatEther } from 'viem';
import { TwitterXIcon } from '@/components/global/Icons';
import {
  getDisplayUsername,
  shareToFarcaster,
  shareToTwitter,
} from '@/utils/share';
import { trpc } from '@/trpc/client';
import DisplayAddress from '@/components/global/DisplayAddress';
import { useChainInfo } from '@/hooks/useChainInfo';
import { uploadFile } from '@/utils/pinata';
import { Currency } from '@/utils/types';

function computePoidhPoints(paid: number, currency: Currency) {
  if (currency === 'degen') return paid / 500;
  else return paid * 1000;
}

export default function ConfirmBountySuccessModal({
  open,
  onClose,
  claimImage,
  claimTitle,
  claimIssuer,
  bountyTitle,
  bountyAmount,
  bountyIssuer,
}: {
  open: boolean;
  onClose: () => void;
  claimImage: string;
  claimTitle: string;
  claimIssuer: string;
  bountyTitle: string;
  bountyAmount: string;
  bountyIssuer: string;
}) {
  const router = useRouter();
  const chain = useChainInfo();
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const shareBtnRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const usersQuery = trpc.neynar.usersData.useQuery(
    {
      addresses: [bountyIssuer, claimIssuer],
    },
    {
      enabled: !!open && !!bountyIssuer && !!claimIssuer,
    }
  );

  const claimIssuerData = usersQuery.data?.find(
    (user) =>
      claimIssuer.toLocaleLowerCase() === user.address.toLocaleLowerCase()
  );

  const paidEth = Number(formatEther(BigInt(bountyAmount)));
  const points = computePoidhPoints(paidEth, chain.currency);

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

    return () => {
      document.removeEventListener('mousedown', handleDocClick);
    };
  }, [shareOpen]);

  const handleShareTwitter = () => {
    const claimIssuerUsername = getDisplayUsername(claimIssuerData, 'twitter');
    const pointsDisplay = points > 0.01 ? points.toFixed(2) : '<0.01';

    const text = `I just collected this NFT from ${claimIssuerUsername} and earned ${pointsDisplay} points by confirming my bounty ${bountyTitle} on @poidhxyz 📸`;

    shareToTwitter(text);
  };

  const handleShareFarcaster = async () => {
    const claimIssuerUsername = getDisplayUsername(
      claimIssuerData,
      'farcaster'
    );

    const pointsDisplay = points > 0.01 ? points.toFixed(2) : '<0.01';

    const text = `I just collected this NFT from ${claimIssuerUsername} and earned ${pointsDisplay} points by confirming my bounty ${bountyTitle} on /poidh 📸`;

    setIsGeneratingCard(true);

    try {
      const cardUrl = new URL(
        '/api/generate-claim-card',
        window.location.origin
      );

      cardUrl.searchParams.set('image', claimImage);
      cardUrl.searchParams.set('title', claimTitle.slice(0, 30));
      cardUrl.searchParams.set('issuer', claimIssuerUsername);

      const claimIssuerPfp = claimIssuerData?.pfpUrl;

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

      await shareToFarcaster({
        text,
        embedImage: claimImage,
      });
    } finally {
      setIsGeneratingCard(false);
    }
  };

  const handleCopyLink = async () => {
    const cleanUrl = `${window.location.origin}${window.location.pathname}`;

    try {
      await navigator.clipboard.writeText(cleanUrl);
    } catch {
      const textArea = document.createElement('textarea');

      textArea.value = cleanUrl;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';

      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      document.execCommand('copy');
      document.body.removeChild(textArea);
    }

    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 1500);
  };

  if (!open) return null;

  return (
    <div
      className='fixed inset-0 z-[1400] bg-black/30 flex items-center justify-center p-4'
      onClick={onClose}
    >
      <div
        className='relative w-[calc(100vw-2rem)] sm:w-[520px] max-w-[520px] bg-poidhBlue/90 dark:bg-[#132b47] rounded-xl p-6 border border-[#D1ECFF] max-h-[90vh] overflow-y-auto'
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className='absolute top-2 right-2 text-white/70 hover:text-white transition-colors'
          aria-label='Close'
        >
          <svg
            width='20'
            height='20'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <line x1='18' y1='6' x2='6' y2='18' />
            <line x1='6' y1='6' x2='18' y2='18' />
          </svg>
        </button>

        <p className='font-family-geist text-sm text-white/90 font-bold text-center'>
          bounty successfully finalized!{' '}
          <span className='bounce-emoji'>🎉</span>
        </p>

        <p className='mt-4 text-white/80 text-sm text-center'>
          you just collected this NFT:
        </p>

        <div className='mt-4 bg-poidhRed rounded-lg p-4'>
          <div className='w-full aspect-[4/3] rounded-lg overflow-hidden bg-white/10 relative'>
            {claimImage ? (
              <Image
                src={claimImage}
                alt='Collected NFT'
                fill
                className='object-contain'
              />
            ) : (
              <div className='w-full h-48 bg-white/5 flex items-center justify-center text-white/60'>
                no image
              </div>
            )}
          </div>

          <div className='mt-3 text-white text-sm leading-relaxed'>
            <div className='font-semibold text-lg'>
              {claimTitle}
            </div>

            <div className='mt-2 opacity-90 flex items-center gap-2'>
              <span>issuer:</span>
              <DisplayAddress address={claimIssuer.toLowerCase()} />
            </div>
          </div>
        </div>

        <p className='mt-4 text-white/80 text-sm text-center'>
          and earned this many poidh points:
        </p>

        <div className='flex justify-center mt-2'>
          <div className='bg-poidhBlue/80 dark:bg-[#0d1b2e] px-6 pb-2 rounded-lg'>
            <p className='font-family-pixeloid text-4xl text-poidhRed/95 font-semibold [text-shadow:-0.5px_-0.5px_0_white,0.5px_-0.5px_0_white,-0.5px_0.5px_0_white,0.5px_0.5px_0_white]'>
              {points > 0.01 ? points.toFixed(2) : '<0.01'}
            </p>
          </div>
        </div>

        <div className='mt-4 flex flex-col gap-2 items-center'>
          <div className='relative w-3/4'>
            <button
              ref={shareBtnRef}
              onClick={() => setShareOpen((v) => !v)}
              className='w-full py-3 rounded-lg bg-poidhRed text-white font-medium hover:brightness-110 hover:scale-[1.01] transition-transform'
              aria-expanded={shareOpen}
              aria-haspopup='menu'
            >
              share
            </button>

            {shareOpen && (
              <div
                ref={dropdownRef}
                role='menu'
                aria-label='share menu'
                className='absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+8px)] z-40 p-2 rounded-xl shadow-lg min-w-[200px] ring-1 ring-white/5 bg-poidhBlue/95 dark:bg-[#132b47] backdrop-blur-md border border-[#D1ECFF]'
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

          <button
            onClick={handleCopyLink}
            className='font-family-geist w-3/4 py-3 rounded-lg lowercase bg-[#7fb7ee] dark:bg-[#2a4a6b] dark:border dark:border-[#4a7ab5] text-white shadow-md hover:scale-[1.01] transition-transform'
          >
            {copied ? 'copied!' : 'copy link'}
          </button>

          <button
            onClick={() => router.push(`/account/${bountyIssuer}`)}
            className='font-family-geist w-3/4 py-3 rounded-lg lowercase bg-[#7fb7ee] dark:bg-[#2a4a6b] dark:border dark:border-[#4a7ab5] text-white shadow-md hover:scale-[1.01] transition-transform'
          >
            view your profile
          </button>
        </div>
      </div>
    </div>
  );
}
