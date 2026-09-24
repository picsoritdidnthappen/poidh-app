'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { trpc } from '@/trpc/client';
import { useClaimMedia } from '@/hooks/useClaimMedia';
import { getChainById } from '@/utils/config';
import { ChainId } from '@/utils/types';
import PatternAvatar from '@/components/global/PatternAvatar';

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
  amount: string;
  amountUsd: number;
  timestamp: string;
};

function EarnerAvatar({
  address,
  size = 30,
}: {
  address: string;
  size?: number;
}) {
  const userQuery = trpc.neynar.usersData.useQuery(
    {
      addresses: [address],
    },
    {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    }
  );

  const user = userQuery.data?.[0];

  if (userQuery.isLoading) {
    return (
      <div
        className='rounded-full bg-white/20 animate-pulse'
        style={{
          width: size,
          height: size,
        }}
      />
    );
  }

  if (user?.pfpUrl) {
    return (
      <div
        className='relative overflow-hidden rounded-full'
        style={{
          width: size,
          height: size,
        }}
      >
        <Image
          src={user.pfpUrl}
          alt={user.farcasterTag ?? 'bounty earner'}
          fill
          unoptimized
          className='object-cover'
        />
      </div>
    );
  }

  return (
    <PatternAvatar
      seed={address}
      size={size}
    />
  );
}

function formatPayoutUsd(amount: number) {
  if (amount > 0 && amount < 0.01) {
    return '<$0.01';
  }

  return `$${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function PayoutThumb({
  payout,
}: {
  payout: RecentPayout;
}) {
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

  const {
    mediaUrl,
    isVideo,
    mediaError,
    setMediaError,
  } = useClaimMedia(
    payout.claim.url,
    shouldLoadMedia
  );

  const payoutLabel = formatPayoutUsd(
    payout.amountUsd
  );

  return (
    <div
      ref={thumbRef}
      className='flex-shrink-0 w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 lg:w-40 lg:h-40 xl:w-44 xl:h-44 rounded-lg overflow-hidden relative'
    >
      <Link
        href={`/${chain.slug}/bounty/${payout.bountyId}`}
        className='block relative w-full h-full group'
        aria-label={`view ${payoutLabel} payout`}
      >
        {mediaUrl && !mediaError ? (
          isVideo ? (
            <video
              src={mediaUrl}
              muted
              playsInline
              preload='metadata'
              className='absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
              onError={() => {
                setMediaError(true);
              }}
            />
          ) : (
            <Image
              src={mediaUrl}
              alt={payout.claim.title || 'paid claim'}
              fill
              unoptimized
              className='object-cover group-hover:scale-105 transition-transform duration-300'
              sizes='(max-width: 640px) 112px, (max-width: 768px) 128px, (max-width: 1024px) 144px, (max-width: 1280px) 160px, 176px'
              onError={() => {
                setMediaError(true);
              }}
            />
          )
        ) : mediaError ? (
          <div className='absolute inset-0 flex items-center justify-center bg-[#132b47] text-2xl'>
            📸
          </div>
        ) : (
          <div className='absolute inset-0 bg-white/10 animate-pulse' />
        )}

        {/* Bottom readability gradient */}
        <div className='absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/75 via-black/30 to-transparent pointer-events-none' />

        {/* Dollar payout */}
        <div className='absolute left-2 bottom-2 z-20'>
          <div className='rounded-md bg-black/75 backdrop-blur-sm border border-white/15 px-2 py-1 font-mono text-xs sm:text-sm font-bold text-white shadow-md'>
            {payoutLabel}
          </div>
        </div>

        {/* Earner */}
        <div
          className='absolute right-2 bottom-2 z-20 rounded-full bg-black/70 p-[2px] shadow-md'
          title='bounty earner'
        >
          <EarnerAvatar
            address={payout.claim.issuer}
            size={28}
          />
        </div>

        <div className='absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200' />
      </Link>
    </div>
  );
}

export default function RecentPayouts() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const recentPayoutsQuery =
    trpc.claims.fetchRecentPayouts.useQuery(
      {
        limit: 12,
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

  const payouts =
    (recentPayoutsQuery.data ?? []) as RecentPayout[];

  if (
    !recentPayoutsQuery.isLoading &&
    payouts.length === 0
  ) {
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
          ? Array.from({ length: 12 }).map(
              (_, i) => (
                <div
                  key={i}
                  className='flex-shrink-0 w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 lg:w-40 lg:h-40 xl:w-44 xl:h-44 rounded-lg bg-white/10 animate-pulse'
                />
              )
            )
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
