import { useEffect, useMemo, useState } from 'react';

import { trpc } from '@/trpc/client';
import { preloadClaimMedia } from '@/hooks/useClaimMedia';
import { getChainById } from '@/utils/config';
import { ChainId } from '@/utils/types';

// How many recent claims, and recent payouts, the hero cycles through.
// Divisible by the four side slots, so the claim groups loop evenly.
const FETCH_LIMIT = 28;

// Claim polaroids either side of the centre payout.
export const CLAIMS_PER_SIDE = 2;

export type HeroPolaroid = {
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

// The fields fetchLatest and fetchRecentPayouts rows have in common.
type ClaimRow = {
  claim: { id: number; url: string; issuer: string };
  bountyId: number;
  chainId: number;
  bountyTitle: string;
};

function toPolaroid(
  row: ClaimRow,
  extra: Pick<
    HeroPolaroid,
    'ariaLabel' | 'mediaAlt' | 'issuerLabel' | 'payoutLabel'
  >
): HeroPolaroid {
  const { slug } = getChainById({ chainId: row.chainId as ChainId });

  return {
    key: `${row.chainId}-${row.claim.id}`,
    href: `/${slug}/bounty/${row.bountyId}`,
    mediaSourceUrl: row.claim.url,
    title: row.bountyTitle,
    issuer: row.claim.issuer,
    ...extra,
  };
}

function formatPayoutUsd(amount: number) {
  if (amount > 0 && amount < 0.01) {
    return '<$0.01';
  }

  return amount.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
  });
}

/*
 * The polaroids for cycle number `step`, left to right: claims, the centre
 * payout, claims. Walks both lists newest-first, looping: one payout per step,
 * and the claims in groups of four (skipping the centre payout's own claim if
 * it's in the group). Empty slots are undefined.
 */
export function pickPolaroidsForStep(
  step: number,
  payouts: HeroPolaroid[],
  claims: HeroPolaroid[]
): (HeroPolaroid | undefined)[] {
  const payout = payouts.length ? payouts[step % payouts.length] : undefined;
  const sidePolaroids: HeroPolaroid[] = [];
  const start = step * CLAIMS_PER_SIDE * 2;

  for (
    let i = 0;
    i < claims.length && sidePolaroids.length < CLAIMS_PER_SIDE * 2;
    i++
  ) {
    const claim = claims[(start + i) % claims.length];

    if (claim.key !== payout?.key) {
      sidePolaroids.push(claim);
    }
  }

  // Always every slot, so the loading skeletons fill the row like real cards.
  const sides = Array.from(
    { length: CLAIMS_PER_SIDE * 2 },
    (_, i) => sidePolaroids[i]
  );

  return [
    ...sides.slice(0, CLAIMS_PER_SIDE),
    payout,
    ...sides.slice(CLAIMS_PER_SIDE),
  ];
}

/*
 * The hero's polaroids: recent payouts for the centre, recent claims for the
 * sides. polaroidsForStep(step) gives each cycle's row; the caller (Hero) owns
 * the clock and decides when to move on.
 */
export function useHeroPolaroids() {
  const queryOptions = { staleTime: 30_000, refetchOnWindowFocus: false };
  const claimsQuery = trpc.claims.fetchLatest.useQuery(
    { limit: FETCH_LIMIT },
    queryOptions
  );
  const payoutsQuery = trpc.claims.fetchRecentPayouts.useQuery(
    { limit: FETCH_LIMIT },
    queryOptions
  );

  const claims = useMemo(
    () =>
      (claimsQuery.data ?? []).map((row) =>
        toPolaroid(row, {
          ariaLabel: row.bountyTitle
            ? `view bounty: ${row.bountyTitle}`
            : 'view bounty',
          mediaAlt: row.claim.title || 'claim image',
          issuerLabel: 'claim issuer',
        })
      ),
    [claimsQuery.data]
  );

  const payouts = useMemo(
    () =>
      (payoutsQuery.data ?? []).map((row) => {
        const payoutLabel = formatPayoutUsd(row.amountUsd);

        return toPolaroid(row, {
          ariaLabel: `view ${payoutLabel} payout for ${row.bountyTitle}`,
          mediaAlt: row.claim.title || 'paid claim',
          issuerLabel: 'bounty earner',
          payoutLabel,
        });
      }),
    [payoutsQuery.data]
  );

  const isLoading = claimsQuery.isLoading || payoutsQuery.isLoading;

  // Stable between renders, so Hero's clock only restarts when the data changes.
  return useMemo(
    () => ({
      isLoading,
      polaroidsForStep: (step: number) =>
        pickPolaroidsForStep(step, payouts, claims),
      // A single polaroid has nothing to cycle to.
      canCycle: payouts.length + claims.length > 1,
    }),
    [isLoading, payouts, claims]
  );
}

// How long each step (album word + polaroid row) stays up before the next.
const CYCLE_MS = 5000;

/*
 * The hero's clock: which step it's on, advancing every CYCLE_MS unless
 * paused. Preloads the next step's media while this one is up, so the
 * crossfade lands on loaded images, and waits past CYCLE_MS if they're slow.
 */
export function useHeroCycle(
  polaroids: ReturnType<typeof useHeroPolaroids>,
  isPaused: boolean
) {
  // How many steps in; 0 = the first album and the newest polaroids.
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (polaroids.isLoading || isPaused) {
      return;
    }

    const preloaded = polaroids.canCycle
      ? Promise.all(
          polaroids
            .polaroidsForStep(step + 1)
            .map(
              (polaroid) =>
                polaroid && preloadClaimMedia(polaroid.mediaSourceUrl)
            )
        )
      : Promise.resolve();

    let cancelled = false;
    const timer = setTimeout(() => {
      preloaded.then(() => {
        if (!cancelled) {
          setStep(step + 1);
        }
      });
    }, CYCLE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [step, isPaused, polaroids]);

  return step;
}
