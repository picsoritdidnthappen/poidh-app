'use client';

import { trpc } from '@/trpc/client';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { getChainById } from '@/utils/config';
import { ChainId, Claim } from '@/utils/types';

function ClaimThumb({
  claim,
  bountyId,
  chainId,
}: {
  claim: Claim;
  bountyId: number;
  chainId: ChainId;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const chain = getChainById({ chainId });

  useEffect(() => {
    if (!claim?.url) return;

    fetch(claim.url)
      .then((r) => r.json())
      .then((data) => setImageUrl(data.image))
      .catch(() => {});
  }, [claim?.url]);

  if (!imageUrl) {
    return (
      <div className='flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 xl:w-44 xl:h-44 rounded-lg bg-white/10 animate-pulse' />
    );
  }

  return (
    <Link
      href={`/${chain.slug}/bounty/${bountyId}`}
      className='flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 xl:w-44 xl:h-44 rounded-lg overflow-hidden relative group ring-1 ring-white/10 hover:ring-white/40 transition-all duration-200'
    >
      <Image
        src={imageUrl}
        alt={claim.title || 'claim image'}
        fill
        className='object-cover group-hover:scale-105 transition-transform duration-300'
        sizes='(max-width: 640px) 96px, (max-width: 768px) 112px, (max-width: 1024px) 144px, (max-width: 1280px) 160px, 176px'
        unoptimized
      />
      <div className='absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200' />
    </Link>
  );
}

export default function LatestClaimImages() {
  const activities = trpc.accounts.activities.useInfiniteQuery(
    { address: undefined },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const allItems =
    activities.data?.pages.flatMap((page) => page.items) ?? [];

  const latestClaims = allItems
    .filter(
      (tx: any) =>
        tx.action === 'claim created' && tx.claim != null
    )
    .slice(0, 10);

  useEffect(() => {
    if (
      latestClaims.length < 10 &&
      activities.hasNextPage &&
      !activities.isFetchingNextPage
    ) {
      activities.fetchNextPage();
    }
  }, [
    latestClaims.length,
    activities.hasNextPage,
    activities.isFetchingNextPage,
    activities.fetchNextPage,
  ]);

  if (!activities.isLoading && latestClaims.length === 0) {
    return null;
  }

  return (
    <div className='w-full px-4 lg:px-20 pt-6 pb-2 overflow-hidden'>
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
        className='flex flex-nowrap gap-3 overflow-x-auto pb-2'
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {activities.isLoading
          ? Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className='flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 xl:w-44 xl:h-44 rounded-lg bg-white/10 animate-pulse'
              />
            ))
          : latestClaims.map((tx: any) => (
              <ClaimThumb
                key={tx.tx + String(tx.index ?? '')}
                claim={tx.claim}
                bountyId={tx.bounty?.id ?? tx.bountyId}
                chainId={(tx.bounty?.chainId ??
                  tx.chainId) as ChainId}
              />
            ))}
      </div>
    </div>
  );
}
