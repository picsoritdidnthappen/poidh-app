import Link from 'next/link';
import Image from 'next/image';
import DisplayAddress from '@/components/global/DisplayAddress';
import { useState } from 'react';
import { getChainById } from '@/utils/config';
import { ChainId, Claim } from '@/utils/types';
import { useClaimMedia } from '@/hooks/useClaimMedia';

type ClaimWithMedia = Claim & {
  mediaUrl?: string | null;
};

export default function ClaimImageEmbed({
  claim,
  bountyId,
  chainId,
}: {
  claim: ClaimWithMedia;
  bountyId: number;
  chainId: ChainId;
}) {
  const [renderError, setRenderError] = useState(false);

  const chain = getChainById({ chainId });

  /*
   * Prefer the URL already resolved by the server.
   *
   * This is important for metadata URLs that work server-side
   * but cannot be fetched directly by the browser because of CORS.
   *
   * If no server-resolved media exists, useClaimMedia can still
   * handle direct image/video URLs and other supported formats.
   */
  const mediaSource = claim?.mediaUrl ?? claim?.url;

  const {
    mediaUrl,
    isVideo,
    isLoading,
    mediaError,
  } = useClaimMedia(mediaSource);

  if (!claim) return null;

  const hasMedia = mediaUrl && !renderError;

  return (
    <div className='p-3'>
      <Link href={`/${chain.slug}/bounty/${bountyId}`}>
        <div className='bg-poidhRed p-4 rounded-lg'>
          {hasMedia ? (
            <div className='relative w-full h-[clamp(12rem,50vw,28rem)] rounded-lg overflow-hidden'>
              {isVideo ? (
                <video
                  src={mediaUrl}
                  controls
                  playsInline
                  className='w-full h-full object-cover rounded-lg'
                  onError={() => setRenderError(true)}
                />
              ) : (
                <Image
                  src={mediaUrl}
                  alt={claim.title || 'claim image'}
                  fill
                  className='object-cover'
                  sizes='(max-width: 768px) 100vw, 600px'
                  unoptimized
                  onError={() => setRenderError(true)}
                />
              )}
            </div>
          ) : isLoading ? (
            <div className='w-full h-36 bg-white/10 rounded-lg border border-white/20 flex items-center justify-center'>
              <div className='text-white/60 text-sm'>
                Loading...
              </div>
            </div>
          ) : (
            <div className='w-full h-36 bg-white/10 rounded-lg border border-white/20 flex items-center justify-center'>
              <div className='text-white/60 text-sm'>
                {mediaError || renderError
                  ? 'error loading media'
                  : 'no media'}
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
