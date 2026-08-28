'use client';

import { trpc } from '@/trpc/client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { getChainById } from '@/utils/config';
import { ChainId, Claim } from '@/utils/types';
import { useClaimMedia } from '@/hooks/useClaimMedia';

function hashString(value: string) {
  let hash = 0;

  for (let i = 0; i < value.length; i++) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }

  return Math.abs(hash);
}

function GenerativePlaceholder({
  seed,
}: {
  seed: string;
}) {
  const hash = hashString(seed);

  const hue1 = hash % 360;
  const hue2 = (hash * 7 + 90) % 360;
  const hue3 = (hash * 13 + 180) % 360;

  const x1 = 20 + (hash % 60);
  const y1 = 20 + ((hash >> 3) % 60);
  const x2 = 20 + ((hash >> 5) % 60);
  const y2 = 20 + ((hash >> 7) % 60);

  return (
    <div
      className='absolute inset-0'
      style={{
        background: `
          radial-gradient(
            circle at ${x1}% ${y1}%,
            hsl(${hue1} 85% 65%),
            transparent 45%
          ),
          radial-gradient(
            circle at ${x2}% ${y2}%,
            hsl(${hue2} 85% 60%),
            transparent 50%
          ),
          linear-gradient(
            135deg,
            hsl(${hue3} 70% 45%),
            hsl(${hue1} 75% 30%)
          )
        `,
      }}
    >
      <div className='absolute inset-0 bg-white/5' />

      <div className='absolute inset-0 flex items-center justify-center'>
        <span className='font-mono text-white/50 text-xl sm:text-2xl'>
          📸
        </span>
      </div>
    </div>
  );
}

function ClaimThumb({
  claim,
  bountyId,
  chainId,
}: {
  claim: Claim;
  bountyId: number;
  chainId: ChainId;
}) {
  const chain = getChainById({ chainId });

  const {
    mediaUrl,
    isVideo,
    isLoading,
  } = useClaimMedia(claim.url);

  const placeholderSeed =
    `${chainId}-${claim.id}-${claim.issuer}`;

  return (
    <div className='flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 xl:w-44 xl:h-44 rounded-lg overflow-hidden relative'>
      <Link
        href={`/${chain.slug}/bounty/${bountyId}`}
        className='block relative w-full h-full group'
        aria-label={`view bounty for ${claim.title || 'claim'}`}
      >
        {mediaUrl ? (
          isVideo ? (
            <video
              src={mediaUrl}
              muted
              playsInline
              preload='metadata'
              className='absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
            />
          ) : (
            <Image
              src={mediaUrl}
              alt={claim.title || 'claim image'}
              fill
              className='object-cover group-hover:scale-105 transition-transform duration-300'
              sizes='(max-width: 640px) 96px, (max-width: 768px) 112px, (max-width: 1024px) 144px, (max-width: 1280px) 160px, 176px'
              unoptimized
            />
          )
        ) : isLoading ? (
          <div className='absolute inset-0 bg-white/10 animate-pulse' />
        ) : (
          <GenerativePlaceholder seed={placeholderSeed} />
        )}

        <div className='absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200' />
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

  const activities =
    trpc.accounts.activities.useInfiniteQuery(
      {
        address: undefined,
      },
      {
        getNextPageParam: (lastPage) =>
          lastPage.nextCursor,
      }
    );

  const latestClaims =
    activities.data?.pages
      .flatMap((page) => page.items)
      .filter(
        (tx: any) =>
          tx.action === 'claim created' &&
          tx.claim != null
      )
      .slice(0, 15) ?? [];

  useEffect(() => {
    if (
      activities.hasNextPage &&
      !activities.isFetchingNextPage &&
      latestClaims.length < 15
    ) {
      activities.fetchNextPage();
    }
  }, [
    latestClaims.length,
    activities.hasNextPage,
    activities.isFetchingNextPage,
  ]);

  if (
    !activities.isLoading &&
    latestClaims.length === 0
  ) {
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
        {Array.from({ length: 15 }).map((_, i) => {
          const tx = latestClaims[i];

          return tx && tx.claim ? (
            <ClaimThumb
              key={tx.tx + String(tx.index ?? '')}
              claim={tx.claim as Claim}
              bountyId={
                tx.bounty?.id ?? tx.bountyId
              }
              chainId={
                (tx.bounty?.chainId ??
                  tx.chainId) as ChainId
              }
            />
          ) : (
            <div
              key={i}
              className='flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 xl:w-44 xl:h-44 rounded-lg bg-white/10 animate-pulse'
            />
          );
        })}
      </div>
    </div>
  );
}
