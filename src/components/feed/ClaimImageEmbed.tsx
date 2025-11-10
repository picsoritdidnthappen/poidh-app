import Link from 'next/link';
import Image from 'next/image';
import DisplayAddress from '@/components/global/DisplayAddress';
import { useState, useEffect } from 'react';
import { getChainById } from '@/utils/config';
import { ChainId } from '@/utils/types';
import { trpc } from '@/trpc/client';

export default function ClaimImageEmbed({
  claimId,
  bountyId,
  chainId,
}: {
  claimId: number;
  bountyId: number;
  chainId: ChainId;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const chain = getChainById({ chainId });

  const claim = trpc.claim.useQuery({
    claimId,
    chainId,
  });

  const fetchImageUrl = async (url: string) => {
    setIsLoading(true);
    const response = await fetch(url);
    const data = await response.json();
    setImageUrl(data.image);
    setIsLoading(false);
  };

  useEffect(() => {
    if (claim.data && claim.data.url) {
      fetchImageUrl(claim.data.url);
    }
  }, [claim.data?.url]);

  return (
    <div className='p-3'>
      <Link href={`/${chain.slug}/bounty/${bountyId}`}>
        <div className='bg-poidhRed p-4 rounded-lg'>
          {imageUrl ? (
            <div className='relative w-full h-[clamp(12rem,50vw,28rem)] rounded-lg overflow-hidden'>
              <Image
                src={imageUrl}
                alt={claim.data?.title || 'claim image'}
                fill
                className='object-cover'
                sizes='(max-width: 768px) 100vw, 600px'
                unoptimized
                onError={(e) => {
                  console.error('Image failed to load:', imageUrl, e);
                  setImageUrl(null);
                }}
              />
            </div>
          ) : isLoading ? (
            <div className='w-full h-36 bg-white/10 rounded-lg border border-white/20 flex items-center justify-center'>
              <div className='text-white/60 text-sm'>Loading image...</div>
            </div>
          ) : (
            <div className='w-full h-36 bg-white/10 rounded-lg border border-white/20 flex items-center justify-center'>
              <div className='text-white/60 text-sm'>Error loading image</div>
            </div>
          )}
          <div className='mt-3'>
            <h3 className='text-white text-lg font-bold'>
              {claim.data?.title || '???'}
            </h3>
          </div>
          <div className='mt-2 text-white/80 text-sm flex items-center gap-1'>
            <span>issuer:</span>
            <DisplayAddress
              address={claim.data?.issuer || '???'}
              showPfpIfExists={true}
              pfpSize={16}
            />
          </div>
        </div>
      </Link>
    </div>
  );
}
