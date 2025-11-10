import Link from 'next/link';
import Image from 'next/image';
import DisplayAddress from '@/components/global/DisplayAddress';
import { useState, useEffect } from 'react';
import { getChainById } from '@/utils/config';
import { ChainId, Claim } from '@/utils/types';

export default function ClaimImageEmbed({
  claim,
  bountyId,
  chainId,
}: {
  claim: Claim;
  bountyId: number;
  chainId: ChainId;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [imageError, setImageError] = useState<boolean>(false);
  const chain = getChainById({ chainId });

  const fetchImageUrl = async (url: string) => {
    setIsLoading(true);
    const response = await fetch(url);
    const data = await response.json();
    setImageUrl(data.image);
    setIsLoading(false);
  };

  useEffect(() => {
    if (claim?.url) {
      fetchImageUrl(claim.url);
    }
  }, [claim?.url]);

  if (!claim) return null;

  return (
    <div className='p-3'>
      <Link href={`/${chain.slug}/bounty/${bountyId}`}>
        <div className='bg-poidhRed p-4 rounded-lg'>
          {imageUrl ? (
            <div className='relative w-full h-[clamp(12rem,50vw,28rem)] rounded-lg overflow-hidden'>
              <Image
                src={imageUrl}
                alt={claim.title || 'claim image'}
                fill
                className='object-cover'
                sizes='(max-width: 768px) 100vw, 600px'
                unoptimized
                onError={(e) => {
                  console.error('Image failed to load:', imageUrl, e);
                  setImageUrl(null);
                  setImageError(true);
                }}
              />
            </div>
          ) : isLoading ? (
            <div className='w-full h-36 bg-white/10 rounded-lg border border-white/20 flex items-center justify-center'>
              <div className='text-white/60 text-sm'>Loading image...</div>
            </div>
          ) : (
            <div className='w-full h-36 bg-white/10 rounded-lg border border-white/20 flex items-center justify-center'>
              <div className='text-white/60 text-sm'>
                {imageError ? 'error loading image' : 'no image'}
              </div>
            </div>
          )}
          <div className='mt-3'>
            <h3 className='text-white text-lg font-bold'>
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
