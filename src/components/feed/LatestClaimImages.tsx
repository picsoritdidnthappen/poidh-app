'use client';

import { trpc } from '@/trpc/client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { getChainById } from '@/utils/config';
import { ChainId, Claim } from '@/utils/types';
import { useClaimMedia } from '@/hooks/useClaimMedia';
import { ClaimMedia, IssuerAvatar } from '@/components/claims/ClaimMediaParts';
import { LATEST_CLAIMS_LIMIT } from '@/utils/constants';

function ClaimThumb({
  claim,
  bountyId,
  chainId,
  bountyTitle,
}: {
  claim: Claim;
  bountyId: number;
  chainId: ChainId;
  bountyTitle: string;
}) {
  const chain = getChainById({ chainId });
  const thumbRef = useRef<HTMLDivElement>(null);
  const [shouldLoadMedia, setShouldLoadMedia] = useState(false);

  useEffect(() => {
    const el = thumbRef.current;

    if (!el) return;

    if (!('IntersectionObserver' in window)) {
      setShouldLoadMedia(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoadMedia(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '300px',
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, []);

  const media = useClaimMedia(claim.url, shouldLoadMedia);

  const placeholderSeed = `${chainId}-${claim.id}-${claim.issuer}`;

  return (
    <div
      ref={thumbRef}
      className='flex-shrink-0 w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 lg:w-40 lg:h-40 xl:w-44 xl:h-44 rounded-lg overflow-hidden relative'
    >
      <Link
        href={`/${chain.slug}/bounty/${bountyId}`}
        className='block relative w-full h-full group'
        aria-label={bountyTitle ? `view bounty: ${bountyTitle}` : 'view bounty'}
      >
        <ClaimMedia
          media={media}
          seed={placeholderSeed}
          alt={claim.title || 'claim image'}
          videoControls={false}
          mediaClassName='group-hover:scale-105 transition-transform duration-300'
        />

        {/* softer white frosted bottom fade */}
        <div className='absolute inset-x-0 bottom-0 h-12 sm:h-14 z-10 pointer-events-none'>
          <div className='absolute inset-0 bg-gradient-to-t from-black/20 via-white/[0.08] to-transparent' />
          <div className='absolute inset-x-0 bottom-0 h-8 sm:h-10 backdrop-blur-[7px] bg-white/[0.14]' />
        </div>

        {/* bounty title */}
        {bountyTitle && (
          <div className='absolute left-2 right-8 sm:right-10 bottom-2 z-20 min-w-0'>
            <div
              className='truncate font-mono text-[9px] sm:text-[11px] font-semibold text-white leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]'
              title={bountyTitle}
            >
              {bountyTitle}
            </div>
          </div>
        )}

        {/* claimant PFP */}
        <div
          className='absolute right-1 bottom-1 sm:right-2 sm:bottom-2 z-30 scale-[0.7] sm:scale-[0.75] origin-bottom-right'
          title='claim issuer'
        >
          <IssuerAvatar
            address={claim.issuer}
            fallbackAlt='claim issuer'
            size={28}
          />
        </div>

        <div className='absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 z-10 pointer-events-none' />
      </Link>
    </div>
  );
}

export default function LatestClaimImages() {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;

    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };

    el.addEventListener('wheel', onWheel, {
      passive: false,
    });

    return () => {
      el.removeEventListener('wheel', onWheel);
    };
  }, []);

  const latestClaimsQuery = trpc.claims.fetchLatest.useQuery(
    {
      limit: LATEST_CLAIMS_LIMIT,
    },
    {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    }
  );

  const latestClaims = latestClaimsQuery.data ?? [];

  if (!latestClaimsQuery.isLoading && latestClaims.length === 0) {
    return null;
  }

  return (
    <div className='w-full px-4 lg:px-20 pt-6 pb-2'>
      <div className='flex items-center justify-between mb-3'>
        <span className='font-mono text-xs text-white/70 tracking-widest'>
          latest claims
        </span>

        <Link
          href='/feed'
          className='font-mono text-xs text-white/50 hover:text-white transition-colors underline underline-offset-2'
        >
          see all
        </Link>
      </div>

      <div
        ref={scrollRef}
        className='flex flex-nowrap gap-3 overflow-x-scroll pb-2'
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {latestClaimsQuery.isLoading
          ? Array.from({ length: LATEST_CLAIMS_LIMIT }).map((_, i) => (
              <div
                key={i}
                className='flex-shrink-0 w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 lg:w-40 lg:h-40 xl:w-44 xl:h-44 rounded-lg bg-white/10 animate-pulse'
              />
            ))
          : latestClaims.map((item) => (
              <ClaimThumb
                key={`${item.chainId}-${item.claim.id}`}
                claim={item.claim as Claim}
                bountyId={item.bountyId}
                chainId={item.chainId as ChainId}
                bountyTitle={item.bountyTitle}
              />
            ))}
      </div>
    </div>
  );
}
