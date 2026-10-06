import DisplayAddress from '@/components/global/DisplayAddress';
import { KeyboardEvent, MouseEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getChainById } from '@/utils/config';
import { ChainId, Claim } from '@/utils/types';
import { useClaimMedia } from '@/hooks/useClaimMedia';
import { ClaimMedia } from '@/components/claims/ClaimMediaParts';

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
  const router = useRouter();

  const containerRef = useRef<HTMLDivElement>(null);

  const [shouldLoadMedia, setShouldLoadMedia] = useState(false);

  const [isNavigating, setIsNavigating] = useState(false);

  const chain = getChainById({
    chainId,
  });

  const mediaSource = claim?.mediaUrl ?? claim?.url;

  const bountyHref = `/${chain.slug}/bounty/${bountyId}`;

  /*
   * Only start resolving media when this card is
   * visible or close to becoming visible.
   */
  useEffect(() => {
    const el = containerRef.current;

    if (!el) {
      return;
    }

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
        rootMargin: '400px',
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, []);

  const media = useClaimMedia(mediaSource, shouldLoadMedia);

  if (!claim) {
    return null;
  }

  const placeholderSeed = `${chainId}-${claim.id}-${claim.issuer}`;

  function navigateToBounty() {
    if (isNavigating) {
      return;
    }

    setIsNavigating(true);

    router.push(bountyHref);
  }

  function handleCardClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;

    /*
     * Don't hijack controls or links inside the card.
     *
     * This keeps video controls and issuer/profile links
     * behaving normally.
     */
    if (
      target.closest(
        'a, button, video, input, textarea, select, [data-no-card-nav]'
      )
    ) {
      return;
    }

    const selection = window.getSelection();

    if (selection && selection.toString().trim()) {
      return;
    }

    navigateToBounty();
  }

  function handleCardKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();

      navigateToBounty();
    }
  }

  return (
    <div ref={containerRef} className='p-3'>
      <div
        role='link'
        tabIndex={0}
        aria-label={`Open ${claim.title || 'claim'} bounty`}
        aria-busy={isNavigating}
        onClick={handleCardClick}
        onKeyDown={handleCardKeyDown}
        className={`relative bg-poidhRed p-4 rounded-lg cursor-pointer overflow-hidden transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-white/60 ${
          isNavigating ? 'scale-[0.99]' : 'active:scale-[0.99]'
        }`}
      >
        <div className='relative w-full h-[clamp(12rem,50vw,28rem)] rounded-lg overflow-hidden'>
          <ClaimMedia
            media={media}
            seed={placeholderSeed}
            alt={claim.title || 'claim image'}
          />
        </div>

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

        {isNavigating && (
          <div className='absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-[1px] pointer-events-none'>
            <div className='flex items-center gap-2 rounded-md bg-black/35 px-4 py-2 text-white shadow-lg'>
              <div className='h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white' />

              <span className='font-mono text-sm font-medium'>opening...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
