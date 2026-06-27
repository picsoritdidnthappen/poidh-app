import Link from 'next/link';
import Image from 'next/image';
import DisplayAddress from '@/components/global/DisplayAddress';
import { useState, useEffect } from 'react';
import { getChainById } from '@/utils/config';
import { ChainId, Claim } from '@/utils/types';

import { useClaimMedia } from '@/hooks/useClaimMedia';

export default function ClaimImageEmbed({
  claim,
  bountyId,
  chainId,
}: {
  claim: Claim;
  bountyId: number;
  chainId: ChainId;
}) {
  const { mediaUrl, isVideo, isLoading, mediaError } = useClaimMedia(claim?.url);
  const chain = getChainById({ chainId });

  if (!claim) return null;

  return (
    <div className='p-3'>
      <Link href={`/${chain.slug}/bounty/${bountyId}`}>
        <div className='bg-poidhRed p-4 rounded-lg'>
          {mediaUrl ? (
            <div className='relative w-full h-[clamp(12rem,50vw,28rem)] rounded-lg overflow-hidden'>
              {isVideo ? (
                <video
                  src={mediaUrl}
                  controls
                  className='w-full h-full object-cover rounded-lg'
                  onError={() => {
                    setMediaUrl(null);
                    setMediaError(true);
                  }}
                />
              ) : (
                <Image
                  src={mediaUrl}
                  alt={claim.title || 'claim image'}
                  fill
                  className='object-cover'
                  sizes='(max-width: 768px) 100vw, 600px'
                  unoptimized
                  onError={() => {
                    setMediaUrl(null);
                    setMediaError(true);
                  }}
                />
              )}
            </div>
          ) : isLoading ? (
            <div className='w-full h-36 bg-white/10 rounded-lg border border-white/20 flex items-center justify-center'>
              <div className='text-white/60 text-sm'>Loading...</div>
            </div>
          ) : (
            <div className='w-full h-36 bg-white/10 rounded-lg border border-white/20 flex items-center justify-center'>
              <div className='text-white/60 text-sm'>
                {mediaError ? 'error loading media' : 'no media'}
              </div>
            </div>
          )}
          <div className='mt-3'>
            <h3 className='text-white text-lg font-bold truncate'>
              {claim.title || '???'}
            </h3>
          </div>
          <div className='mt-2 text-white/80 text-sm flex items-center gap-1'>
            <span>issuer:</span>
            <DisplayAddress
              address={claim.issuer || '???'}
              showPfpIfExists={true}
              pfpSize={16}
            />
          </div>
        </div>
      </Link>
    </div>
  );
}
