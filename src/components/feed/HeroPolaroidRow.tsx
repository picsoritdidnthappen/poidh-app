'use client';

import Image from 'next/image';
import Link from 'next/link';
import { CSSProperties, useCallback, useEffect, useState } from 'react';

import { useClaimMedia } from '@/hooks/useClaimMedia';
import { CLAIMS_PER_SIDE, HeroPolaroid } from '@/hooks/useHeroPolaroids';
import { cn } from '@/utils/utils';
import {
  GenerativePlaceholder,
  IssuerAvatar,
} from '@/components/feed/ClaimMediaParts';

// How long a slot takes to crossfade to its next polaroid.
export const POLAROID_FADE_MS = 600;

/*
 * Widths per slot. Below lg they fit the available width (see
 * .hero-polaroid-row in globals.css); the outer pair only shows from lg up.
 */
const CLAIM_WIDTH = 'w-[var(--polaroid-claim)] lg:w-40 xl:w-48';
const PAYOUT_WIDTH = 'w-[var(--polaroid-payout)] lg:w-48 xl:w-56';

/*
 * One slot's polaroid frame. It stays mounted while the slot is given new
 * polaroids; the old face fades out on top while the new one fades in beneath.
 */
function PolaroidSlot({
  polaroid,
  className,
}: {
  polaroid: HeroPolaroid;
  className?: string;
}) {
  const [shown, setShown] = useState(polaroid);
  const [outgoing, setOutgoing] = useState<HeroPolaroid | null>(null);

  if (polaroid.key !== shown.key) {
    setOutgoing(shown);
    setShown(polaroid);
  }

  useEffect(() => {
    if (!outgoing) {
      return;
    }

    const timer = setTimeout(() => setOutgoing(null), POLAROID_FADE_MS);

    return () => clearTimeout(timer);
  }, [outgoing]);

  return (
    <Link
      href={polaroid.href}
      aria-label={polaroid.ariaLabel}
      className={cn('polaroid group block shrink-0', className)}
    >
      <div className='polaroid-faces'>
        <PolaroidFace
          key={polaroid.key}
          polaroid={polaroid}
          className='polaroid-face'
        />
        {outgoing && (
          <PolaroidFace
            key={outgoing.key}
            polaroid={outgoing}
            className='polaroid-face-leaving'
          />
        )}
      </div>
    </Link>
  );
}

function PayoutBadge({ label }: { label: string }) {
  return (
    <div className='absolute -top-4 sm:-top-5 left-1/2 -translate-x-1/2 bg-poidhRed border border-white py-[4px] px-[8px] sm:px-[12px] rounded-full font-mono text-[10px] sm:text-[14px] shadow-md font-semibold text-white leading-tight tabular-nums'>
      {label}
    </div>
  );
}

// What's printed on a polaroid: the claim's photo, bounty title and avatar.
function PolaroidFace({
  polaroid,
  className,
}: {
  polaroid: HeroPolaroid;
  className: string;
}) {
  const { mediaUrl, isVideo, mediaError, setMediaError } = useClaimMedia(
    polaroid.mediaSourceUrl
  );
  const handleMediaError = useCallback(
    () => setMediaError(true),
    [setMediaError]
  );

  return (
    <div className={className}>
      <div className='relative aspect-square overflow-hidden bg-black/10'>
        {mediaUrl && !mediaError ? (
          isVideo ? (
            <video
              src={mediaUrl}
              muted
              playsInline
              preload='metadata'
              className='absolute inset-0 w-full h-full object-cover'
              onError={handleMediaError}
            />
          ) : (
            <Image
              src={mediaUrl}
              alt={polaroid.mediaAlt}
              fill
              unoptimized
              className='object-cover'
              onError={handleMediaError}
            />
          )
        ) : mediaError ? (
          <GenerativePlaceholder seed={polaroid.key} />
        ) : (
          <div className='absolute inset-0 bg-black/10' />
        )}
      </div>

      <div className='flex items-center gap-1.5 pt-2 min-w-0'>
        <div
          className='min-w-0 flex-1 truncate font-mono text-[10px] sm:text-[12px] text-neutral-800 leading-tight'
          title={polaroid.title}
        >
          {polaroid.title}
        </div>
        <div className='shrink-0' title={polaroid.issuerLabel}>
          <IssuerAvatar
            address={polaroid.issuer}
            fallbackAlt={polaroid.issuerLabel}
            size={20}
          />
        </div>
      </div>

      {/* After the photo, so it paints on top of it. */}
      {polaroid.payoutLabel && <PayoutBadge label={polaroid.payoutLabel} />}
    </div>
  );
}

/*
 * The hero's row of polaroids: a recent payout in the centre, recent claims
 * either side. Each slot crossfades when it's given a new polaroid.
 */
export default function HeroPolaroidRow({
  polaroids,
  isLoading,
}: {
  polaroids: (HeroPolaroid | undefined)[];
  isLoading: boolean;
}) {
  if (!isLoading && polaroids.every((polaroid) => !polaroid)) {
    return null;
  }

  return (
    <div className='hero-polaroids w-full px-3 lg:px-20 pt-6 pb-4'>
      <div
        className='hero-polaroid-row flex items-center justify-center pb-6'
        style={{ '--polaroid-fade': `${POLAROID_FADE_MS}ms` } as CSSProperties}
      >
        {polaroids.map((polaroid, slot) => {
          const offset = slot - CLAIMS_PER_SIDE;
          const isCenter = offset === 0;
          const className = cn(
            'shrink-0',
            isCenter ? PAYOUT_WIDTH : CLAIM_WIDTH,
            Math.abs(offset) === CLAIMS_PER_SIDE && 'hidden lg:block'
          );

          if (!polaroid) {
            return isLoading ? (
              <div
                key={`skeleton-${slot}`}
                className={cn('polaroid', className)}
              >
                <div className='aspect-square bg-black/10' />
                {/* The caption's height: pt-2 plus the 20px avatar. */}
                <div className='h-7' />
              </div>
            ) : null;
          }

          return (
            <PolaroidSlot
              key={`slot-${slot}`}
              polaroid={polaroid}
              className={className}
            />
          );
        })}
      </div>
    </div>
  );
}
