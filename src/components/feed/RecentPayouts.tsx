'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { trpc } from '@/trpc/client';
import { useClaimMedia } from '@/hooks/useClaimMedia';
import { getChainById } from '@/utils/config';
import { ChainId } from '@/utils/types';
import { ClaimMedia, IssuerAvatar } from '@/components/claims/ClaimMediaParts';
import { RECENT_PAYOUTS_LIMIT } from '@/utils/constants';

type RecentPayout = {
  claim: {
    id: number;
    chainId: number;
    title: string;
    url: string;
    issuer: string;
  };
  bountyId: number;
  chainId: number;
  bountyTitle: string;
  amount: string;
  amountUsd: number;
  timestamp: string;
};

function formatPayoutUsd(amount: number) {
  if (amount > 0 && amount < 0.01) {
    return '<$0.01';
  }

  return `$${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function PayoutThumb({ payout }: { payout: RecentPayout }) {
  const chain = getChainById({
    chainId: payout.chainId as ChainId,
  });

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

  const media = useClaimMedia(payout.claim.url, shouldLoadMedia);

  const payoutLabel = formatPayoutUsd(payout.amountUsd);

  const placeholderSeed = `${payout.chainId}-${payout.claim.id}-${payout.claim.issuer}`;

  return (
    <div
      ref={thumbRef}
      className='flex-shrink-0 w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 lg:w-40 lg:h-40 xl:w-44 xl:h-44 rounded-lg overflow-hidden relative'
    >
      <Link
        href={`/${chain.slug}/bounty/${payout.bountyId}`}
        className='block relative w-full h-full group'
        aria-label={`view ${payoutLabel} payout for ${payout.bountyTitle}`}
      >
        <ClaimMedia
          media={media}
          seed={placeholderSeed}
          alt={payout.claim.title || 'paid claim'}
          videoControls={false}
          mediaClassName='group-hover:scale-105 transition-transform duration-300'
        />

        {/* payout amount — top right */}
        <div className='absolute top-2 right-2 z-30'>
          <div className='recent-payout-price rounded-md backdrop-blur-sm border border-white/15 px-2 py-1 font-mono text-xs sm:text-sm font-bold text-white shadow-md'>
            {payoutLabel}
          </div>
        </div>

        {/* softer white frosted bottom fade */}
        <div className='absolute inset-x-0 bottom-0 h-12 sm:h-14 z-10 pointer-events-none'>
          <div className='absolute inset-0 bg-gradient-to-t from-black/20 via-white/[0.08] to-transparent' />
          <div className='absolute inset-x-0 bottom-0 h-8 sm:h-10 backdrop-blur-[7px] bg-white/[0.14]' />
        </div>

        {/* bounty title */}
        {payout.bountyTitle && (
          <div className='absolute left-2 right-8 sm:right-10 bottom-2 z-20 min-w-0'>
            <div
              className='truncate font-mono text-[9px] sm:text-[11px] font-semibold text-white leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]'
              title={payout.bountyTitle}
            >
              {payout.bountyTitle}
            </div>
          </div>
        )}

        {/* earner PFP */}
        <div
          className='absolute right-1 bottom-1 sm:right-2 sm:bottom-2 z-30 scale-[0.7] sm:scale-[0.75] origin-bottom-right'
          title='bounty earner'
        >
          <IssuerAvatar
            address={payout.claim.issuer}
            fallbackAlt='bounty earner'
            size={28}
          />
        </div>

        <div className='absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 z-10 pointer-events-none' />
      </Link>
    </div>
  );
}

export default function RecentPayouts() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const recentPayoutsQuery = trpc.claims.fetchRecentPayouts.useQuery(
    {
      limit: RECENT_PAYOUTS_LIMIT,
    },
    {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    }
  );

  useEffect(() => {
    const el = scrollRef.current;

    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) {
        return;
      }

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

  const payouts = (recentPayoutsQuery.data ?? []) as RecentPayout[];

  if (!recentPayoutsQuery.isLoading && payouts.length === 0) {
    return null;
  }

  return (
    <div className='w-full px-4 lg:px-20 pt-4 pb-3'>
      <div className='flex items-center justify-between mb-3'>
        <span className='font-mono text-xs text-white/70 tracking-widest'>
          recent payouts
        </span>

        <Link
          href='/?tab=past&sort=date'
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
        {recentPayoutsQuery.isLoading
          ? Array.from({ length: RECENT_PAYOUTS_LIMIT }).map((_, i) => (
              <div
                key={i}
                className='flex-shrink-0 w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 lg:w-40 lg:h-40 xl:w-44 xl:h-44 rounded-lg bg-white/10 animate-pulse'
              />
            ))
          : payouts.map((payout) => (
              <PayoutThumb
                key={`${payout.chainId}-${payout.claim.id}`}
                payout={payout}
              />
            ))}
      </div>
    </div>
  );
}
