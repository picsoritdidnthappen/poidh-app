'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { trpc } from '@/trpc/client';
import { useClaimMedia } from '@/hooks/useClaimMedia';
import { getChainById } from '@/utils/config';
import { ChainId } from '@/utils/types';
import { cn } from '@/utils/utils';
import {
  GenerativePlaceholder,
  IssuerAvatar,
} from '@/components/feed/ClaimMediaParts';

// Divisible by the four side cards, so the claim groups loop evenly.
const POOL_SIZE = 28;
// The crossfade between deals; drives the polaroid-face animations via
// --polaroid-fade.
export const FADE_MS = 600;

type RecentPayout = {
  claim: {
    id: number;
    chainId: number;
    title: string;
    url: string;
    issuer: string;
  };
  bountyId: number;
  chainId: number;
  bountyTitle: string;
  amount: string;
  amountUsd: number;
  timestamp: string;
};

function formatPayoutUsd(amount: number) {
  if (amount > 0 && amount < 0.01) {
    return '<$0.01';
  }

  return `$${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
// Claims either side of the centre payout.
const SIDE_COUNT = 2;

export type SpreadCard = {
  key: string;
  href: string;
  ariaLabel: string;
  mediaSourceUrl: string;
  mediaAlt: string;
  title: string;
  issuer: string;
  issuerLabel: string;
  payoutLabel?: string;
};

/*
 * Widths per slot. Below lg they fit the available width (see .polaroid-row
 * in globals.css); the outer pair only shows from lg up.
 */
const CLAIM_WIDTH = 'w-[var(--polaroid-claim)] lg:w-40 xl:w-48';
const PAYOUT_WIDTH = 'w-[var(--polaroid-payout)] lg:w-48 xl:w-56';

/*
 * The cards deal number `step` puts in each slot, left to right. Walks both
 * pools newest-first, looping: one payout per deal, and the claims in groups
 * of four (skipping the centre payout's own claim if it's in the group).
 */
function dealSlots(
  step: number,
  payouts: SpreadCard[],
  claims: SpreadCard[]
): (SpreadCard | undefined)[] {
  const payout = payouts.length ? payouts[step % payouts.length] : undefined;
  const sideCards: SpreadCard[] = [];

  for (
    let i = step * SIDE_COUNT * 2;
    sideCards.length < SIDE_COUNT * 2 &&
    i < step * SIDE_COUNT * 2 + claims.length;
    i++
  ) {
    const claim = claims[i % claims.length];

    if (claim.key !== payout?.key) {
      sideCards.push(claim);
    }
  }

  // Always every slot, so the loading skeletons fill the row like real cards.
  const side = (i: number) => sideCards[i];

  return [
    ...Array.from({ length: SIDE_COUNT }, (_, i) => side(i)),
    payout,
    ...Array.from({ length: SIDE_COUNT }, (_, i) => side(SIDE_COUNT + i)),
  ];
}

/*
 * A polaroid's frame stays mounted for its slot; when the slot is dealt a new
 * card, the old face fades out on top while the new one fades in beneath.
 */
function PolaroidCard({
  card,
  className,
}: {
  card: SpreadCard;
  className?: string;
}) {
  const [shown, setShown] = useState(card);
  const [outgoing, setOutgoing] = useState<SpreadCard | null>(null);

  if (card.key !== shown.key) {
    setOutgoing(shown);
    setShown(card);
  }

  useEffect(() => {
    if (!outgoing) {
      return;
    }

    const timer = setTimeout(() => setOutgoing(null), FADE_MS);

    return () => clearTimeout(timer);
  }, [outgoing]);

  return (
    <Link
      href={card.href}
      aria-label={card.ariaLabel}
      className={cn('polaroid group block shrink-0', className)}
    >
      <div className='polaroid-faces'>
        <PolaroidFace key={card.key} card={card} className='polaroid-face' />
        {outgoing && (
          <PolaroidFace
            key={outgoing.key}
            card={outgoing}
            className='polaroid-face-leaving'
          />
        )}
      </div>
    </Link>
  );
}

function PolaroidFace({
  card,
  className,
}: {
  card: SpreadCard;
  className: string;
}) {
  const { mediaUrl, isVideo, mediaError, setMediaError } = useClaimMedia(
    card.mediaSourceUrl
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
              alt={card.mediaAlt}
              fill
              unoptimized
              className='object-cover'
              onError={handleMediaError}
            />
          )
        ) : mediaError ? (
          <GenerativePlaceholder seed={card.key} />
        ) : (
          <div className='absolute inset-0 bg-black/10' />
        )}
      </div>

      <div className='flex items-center gap-1.5 pt-2 min-w-0'>
        <div className='min-w-0 flex-1'>
          {card.payoutLabel && (
            <div className='absolute -top-4 sm:-top-5 left-1/2 -translate-x-1/2 bg-poidhRed border border-white py-[4px] px-[8px] sm:px-[12px] rounded-full font-mono text-[10px] sm:text-[14px] shadow-md font-semibold text-white leading-tight tabular-nums'>
              {card.payoutLabel}
            </div>
          )}
          <div
            className='truncate font-mono text-[10px] sm:text-[12px] text-neutral-800 leading-tight'
            title={card.title}
          >
            {card.title}
          </div>
        </div>
        <div className='shrink-0' title={card.issuerLabel}>
          <IssuerAvatar
            address={card.issuer}
            fallbackAlt={card.issuerLabel}
            size={20}
          />
        </div>
      </div>
    </div>
  );
}

/*
 * The polaroid deck: recent payouts for the centre, recent claims for the
 * sides. deal(step) gives the cards for deal number `step` (see dealSlots);
 * whoever owns the clock (Hero) decides when to move on.
 */
export function useSpreadDeck() {
  const queryOptions = { staleTime: 30_000, refetchOnWindowFocus: false };
  const claimsQuery = trpc.claims.fetchLatest.useQuery(
    { limit: POOL_SIZE },
    queryOptions
  );
  const payoutsQuery = trpc.claims.fetchRecentPayouts.useQuery(
    { limit: POOL_SIZE },
    queryOptions
  );

  const claims: SpreadCard[] = useMemo(
    () =>
      (claimsQuery.data ?? []).map((item) => ({
        key: `${item.chainId}-${item.claim.id}`,
        href: `/${
          getChainById({ chainId: item.chainId as ChainId }).slug
        }/bounty/${item.bountyId}`,
        ariaLabel: item.bountyTitle
          ? `view bounty: ${item.bountyTitle}`
          : 'view bounty',
        mediaSourceUrl: item.claim.url,
        mediaAlt: item.claim.title || 'claim image',
        title: item.bountyTitle,
        issuer: item.claim.issuer,
        issuerLabel: 'claim issuer',
      })),
    [claimsQuery.data]
  );

  const payouts: SpreadCard[] = useMemo(
    () =>
      ((payoutsQuery.data ?? []) as RecentPayout[]).map((payout) => {
        const payoutLabel = formatPayoutUsd(payout.amountUsd);

        return {
          key: `${payout.chainId}-${payout.claim.id}`,
          href: `/${
            getChainById({ chainId: payout.chainId as ChainId }).slug
          }/bounty/${payout.bountyId}`,
          ariaLabel: `view ${payoutLabel} payout for ${payout.bountyTitle}`,
          mediaSourceUrl: payout.claim.url,
          mediaAlt: payout.claim.title || 'paid claim',
          title: payout.bountyTitle,
          issuer: payout.claim.issuer,
          issuerLabel: 'bounty earner',
          payoutLabel,
        };
      }),
    [payoutsQuery.data]
  );

  const isLoading = claimsQuery.isLoading || payoutsQuery.isLoading;

  // Stable between renders, so Hero's clock only restarts when the deck changes.
  return useMemo(
    () => ({
      isLoading,
      deal: (step: number) => dealSlots(step, payouts, claims),
      // A single card has nothing to cycle to.
      canCycle: payouts.length + claims.length > 1,
    }),
    [isLoading, payouts, claims]
  );
}

/*
 * A fixed spread of polaroids: a recent payout in the centre, recent claims
 * either side. Each slot crossfades when it's dealt a new card.
 */
export default function ClaimSpread({
  slots,
  isLoading,
}: {
  slots: (SpreadCard | undefined)[];
  isLoading: boolean;
}) {
  if (!isLoading && slots.every((card) => !card)) {
    return null;
  }

  return (
    <div className='polaroid-spread w-full px-3 lg:px-20 pt-6 pb-4'>
      <div
        className='polaroid-row flex items-center justify-center pb-6'
        style={{ '--polaroid-fade': `${FADE_MS}ms` } as CSSProperties}
      >
        {slots.map((card, slot) => {
          const offset = slot - SIDE_COUNT;
          const isCenter = offset === 0;
          const className = cn(
            'shrink-0',
            isCenter ? PAYOUT_WIDTH : CLAIM_WIDTH,
            Math.abs(offset) === SIDE_COUNT && 'hidden lg:block'
          );

          if (!card) {
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
            <PolaroidCard
              key={`slot-${slot}`}
              card={card}
              className={className}
            />
          );
        })}
      </div>
    </div>
  );
}
