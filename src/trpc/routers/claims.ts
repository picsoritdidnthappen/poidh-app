'use client';

import { trpc } from '@/trpc/client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { getChainById } from '@/utils/config';
import { ChainId, Claim } from '@/utils/types';
import { useClaimMedia } from '@/hooks/useClaimMedia';

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

  return (
    <div className='flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 xl:w-44 xl:h-44 rounded-lg overflow-hidden relative'>
      {mediaUrl ? (
        <Link
          href={`/${chain.slug}/bounty/${bountyId}`}
          className='block w-full h-full group relative'
        >
          {isVideo ? (
            <video
              src={mediaUrl}
              muted
              playsInline
              preload='metadata'
              className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
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
          )}

          <div className='absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200' />
        </Link>
      ) : isLoading ? (
        <div className='w-full h-full bg-white/10 animate-pulse' />
      ) : (
        <div className='w-full h-full bg-white/10' />
      )}
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

  const activities = trpc.accounts.activities.useInfiniteQuery(
    {
      address: undefined,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
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
