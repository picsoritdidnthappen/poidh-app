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

  const palette = [
    '#F45B5B',
    '#FFD166',
    '#118AB2',
    '#7B61FF',
    '#06D6A0',
    '#F4A261',
  ];

  const background =
    palette[hash % palette.length];

  const accent1 =
    palette[(hash + 2) % palette.length];

  const accent2 =
    palette[(hash + 4) % palette.length];

  const vertical =
    28 + ((hash >> 2) % 38);

  const horizontal =
    30 + ((hash >> 4) % 36);

  const smallBlockLeft =
    8 + ((hash >> 6) % 58);

  const smallBlockTop =
    8 + ((hash >> 8) % 58);

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

  const mediaSource =
    claim?.mediaUrl ?? claim?.url;

  const {
    mediaUrl,
    isVideo,
    isLoading,
  } = useClaimMedia(mediaSource);

  if (!claim) return null;

  const hasMedia =
    !!mediaUrl && !renderError;

  const placeholderSeed =
    `${chainId}-${claim.id}-${claim.issuer}`;

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
                  onError={() =>
                    setRenderError(true)
                  }
                />
              ) : (
                <Image
                  src={mediaUrl}
                  alt={
                    claim.title ||
                    'claim image'
                  }
                  fill
                  className='object-cover'
                  sizes='(max-width: 768px) 100vw, 600px'
                  unoptimized
                  onError={() =>
                    setRenderError(true)
                  }
                />
              )}
            </div>
          ) : isLoading ? (
            <div className='relative w-full h-[clamp(12rem,50vw,28rem)] rounded-lg overflow-hidden bg-white/10 animate-pulse' />
          ) : (
            <div className='relative w-full h-[clamp(12rem,50vw,28rem)] rounded-lg overflow-hidden'>
              <GenerativePlaceholder
                seed={placeholderSeed}
              />
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
              address={
                claim.issuer || '???'
              }
              showPfpIfExists={true}
              pfpSize={16}
            />
          </div>
        </div>
      </Link>
    </div>
  );
}
