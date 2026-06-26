import Link from 'next/link';
import Image from 'next/image';
import DisplayAddress from '@/components/global/DisplayAddress';
import { useState, useEffect } from 'react';
import { getChainById } from '@/utils/config';
import { ChainId, Claim } from '@/utils/types';

const VIDEO_EXTENSIONS = /\.(mp4|mov|webm|ogg)(\?.*)?$/i;
const IPFS_URL_PATTERN = /https?:\/\/[^\s"]+\/ipfs\/[a-zA-Z0-9]+[^\s"]*/g;

function isVideo(url: string) {
  return VIDEO_EXTENSIONS.test(url);
}

export default function ClaimImageEmbed({
  claim,
  bountyId,
  chainId,
}: {
  claim: Claim;
  bountyId: number;
  chainId: ChainId;
}) {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [mediaError, setMediaError] = useState<boolean>(false);
  const chain = getChainById({ chainId });

  useEffect(() => {
    if (!claim?.url || typeof claim.url !== 'string') return;

    const resolve = async () => {
      setIsLoading(true);
      setMediaError(false);

      try {
        const response = await fetch(claim.url as string);
        const contentType = response.headers.get('content-type') ?? '';

        // Direct video file
        if (contentType.startsWith('video/') || VIDEO_EXTENSIONS.test(claim.url as string)) {
          setMediaUrl(claim.url as string);
          setIsVideo(true);
          setIsLoading(false);
          return;
        }

        // Direct image file
        if (contentType.startsWith('image/')) {
          setMediaUrl(claim.url);
          setIsVideo(false);
          setIsLoading(false);
          return;
        }

        // Try parsing as JSON metadata
        const text = await response.text();
        try {
          const data = JSON.parse(text);
          if (data.image) {
            const url = data.image;
            setMediaUrl(url);
            setIsVideo(VIDEO_EXTENSIONS.test(url));
            setIsLoading(false);
            return;
          }
        } catch {
          // Not JSON — fall through to IPFS URL extraction
        }

        // Extract first IPFS URL from raw text
        const matches = text.match(IPFS_URL_PATTERN);
        if (matches && matches.length > 0) {
          // Prefer a video URL if present, otherwise use first match
          const videoMatch = matches.find((m) => VIDEO_EXTENSIONS.test(m));
          const chosen = videoMatch ?? matches[0];
          setMediaUrl(chosen);
          setIsVideo(!!videoMatch);
          setIsLoading(false);
          return;
        }

        // Nothing found
        setMediaError(true);
        setIsLoading(false);
      } catch {
        setMediaError(true);
        setIsLoading(false);
      }
    };

    resolve();
  }, [claim?.url]);

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
