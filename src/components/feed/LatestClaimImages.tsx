'use client';

import { trpc } from '@/trpc/client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { getChainById } from '@/utils/config';
import { ChainId, Claim } from '@/utils/types';
import { useClaimMedia } from '@/hooks/useClaimMedia';
import PatternAvatar from '@/components/global/PatternAvatar';

function hashString(value: string) {
  let hash = 0;

  for (let i = 0; i < value.length; i++) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }

  return Math.abs(hash);
}

function GenerativePlaceholder({ seed }: { seed: string }) {
  const hash = hashString(seed);

  const palette = [
    '#F45B5B',
    '#FFD166',
    '#118AB2',
    '#7B61FF',
    '#06D6A0',
    '#F4A261',
  ];

  const background = palette[hash % palette.length];
  const accent1 = palette[(hash + 2) % palette.length];
  const accent2 = palette[(hash + 4) % palette.length];

  const vertical = 28 + ((hash >> 2) % 38);
  const horizontal = 30 + ((hash >> 4) % 36);

  const smallBlockLeft = 8 + ((hash >> 6) % 58);
  const smallBlockTop = 8 + ((hash >> 8) % 58);

  return (
    <div
      className='absolute inset-0 overflow-hidden'
      style={{
        backgroundColor: background,
      }}
    >
      <div
        className='absolute top-0 bottom-0 w-[4px] bg-[#102A43]'
        style={{
          left: `${vertical}%`,
        }}
      />

      <div
        className='absolute left-0 right-0 h-[4px] bg-[#102A43]'
        style={{
          top: `${horizontal}%`,
        }}
      />

      <div
        className='absolute'
        style={{
          left: `${vertical}%`,
          top: 0,
          right: 0,
          height: `${horizontal}%`,
          backgroundColor: accent1,
        }}
      />

      <div
        className='absolute border-[4px] border-[#102A43]'
        style={{
          left: `${smallBlockLeft}%`,
          top: `${smallBlockTop}%`,
          width: '24%',
          height: '24%',
          backgroundColor: accent2,
        }}
      />
    </div>
  );
}

function ClaimantAvatar({
  address,
  size = 28,
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
          alt={user.farcasterTag ?? 'claim issuer'}
          fill
          unoptimized
          className='object-cover'
        />
      </div>
    );
  }

  return <PatternAvatar seed={address} size={size} />;
}

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

  const {
    mediaUrl,
    isVideo,
    mediaError,
    setMediaError,
  } = useClaimMedia(claim.url, shouldLoadMedia);

  const placeholderSeed = `${chainId}-${claim.id}-${claim.issuer}`;

  return (
    <div
      ref={thumbRef}
      className='flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 xl:w-44 xl:h-44 rounded-lg overflow-hidden relative'
    >
      <Link
        href={`/${chain.slug}/bounty/${bountyId}`}
        className='block relative w-full h-full group'
        aria-label={
          bountyTitle
            ? `view bounty: ${bountyTitle}`
            : 'view bounty'
        }
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
              alt={claim.title || 'claim image'}
              fill
              className='object-cover group-hover:scale-105 transition-transform duration-300'
              sizes='(max-width: 640px) 96px, (max-width: 768px) 112px, (max-width: 1024px) 144px, (max-width: 1280px) 160px, 176px'
              unoptimized
              onError={() => {
                setMediaError(true);
              }}
            />
          )
        ) : mediaError ? (
          <GenerativePlaceholder seed={placeholderSeed} />
        ) : (
          <div className='absolute inset-0 bg-white/10 animate-pulse' />
        )}

        {/* strong white frosted bottom fade */}
        <div className='absolute inset-x-0 bottom-0 h-12 sm:h-14 z-10 pointer-events-none'>
          <div className='absolute inset-0 bg-gradient-to-t from-black/20 via-white/[0.15] to-transparent' />
          <div className='absolute inset-x-0 bottom-0 h-8 sm:h-10 backdrop-blur-[12px] bg-white/[0.28] border-t border-white/30' />
        </div>

        {/* bounty title */}
        {bountyTitle && (
          <div className='absolute left-2 right-8 sm:right-10 bottom-2 z-20 min-w-0'>
            <div
              className='truncate font-mono text-[9px] sm:text-[11px] font-semibold text-white leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]'
              title={bountyTitle}
            >
              {bountyTitle}
            </div>
          </div>
        )}

        {/* claimant PFP */}
        <div
          className='absolute right-1 bottom-1 sm:right-2 sm:bottom-2 z-30 rounded-full bg-black/70 p-[2px] shadow-md scale-[0.7] sm:scale-[0.75] origin-bottom-right'
          title='claim issuer'
        >
          <ClaimantAvatar
            address={claim.issuer}
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
      limit: 15,
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
          ? Array.from({ length: 15 }).map((_, i) => (
              <div
                key={i}
                className='flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 xl:w-44 xl:h-44 rounded-lg bg-white/10 animate-pulse'
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
