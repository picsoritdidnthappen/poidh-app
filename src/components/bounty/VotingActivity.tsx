'use client';

import { useEffect, useMemo, useState } from 'react';

/**
 * Display-only component. The parent must supply the eligible voter snapshot
 * and the vote transactions for the CURRENT voting round, not all history.
 * Never infer an individual's vote from the aggregate yes/no weights.
 */
export type VotingActivityContributor = {
  address: string;
  displayName?: string | null;
  pfpUrl?: string | null;
  weightWei?: string;
};

export type VotingActivityVote = {
  address: string;
  choice: 'yes' | 'no';
  transactionHash: string;
  /** Block/log order needed if the contract allows more than one vote per wallet. */
  blockNumber?: number;
  logIndex?: number;
};

type VotingActivityProps = {
  chainId: 1 | 42161 | 8453;
  /** Unix seconds, NOT milliseconds. */
  deadline: number;
  issuer: string;
  /** The nomination transaction automatically casts the issuer's YES vote. */
  nominationTxHash?: string | null;
  /** Eligible voters for this round, including any issuer contribution. */
  contributors: VotingActivityContributor[];
  /** Transactions for this vote round only. */
  votes: VotingActivityVote[];
  className?: string;
};

type ClassifiedVoter = VotingActivityContributor & {
  choice: 'yes' | 'no' | 'pending';
  transactionHash?: string;
  isIssuer: boolean;
};

const EXPLORERS: Record<VotingActivityProps['chainId'], string> = {
  1: 'https://etherscan.io',
  42161: 'https://arbiscan.io',
  8453: 'https://basescan.org',
};

function shortened(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function isHash(value: unknown): value is string {
  return typeof value === 'string' && /^0x[\da-fA-F]{64}$/.test(value);
}

function renderRow(voter: ClassifiedVoter, explorer: string) {
  const txUrl = isHash(voter.transactionHash)
    ? `${explorer}/tx/${voter.transactionHash}`
    : null;
  const href = txUrl ?? `${explorer}/address/${voter.address}`;
  const label = txUrl ? 'View vote transaction' : 'View wallet in explorer';

  return (
    <a
      key={voter.address.toLowerCase()}
      href={href}
      target='_blank'
      rel='noopener noreferrer'
      aria-label={`${label}: ${voter.address}`}
      className='group flex min-w-0 items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white'
    >
      {voter.pfpUrl ? (
        // External PFP hostnames differ by user; next/image domain allowlists do not apply here.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={voter.pfpUrl}
          alt=''
          loading='lazy'
          className='h-9 w-9 shrink-0 rounded-full border border-white/20 object-cover'
        />
      ) : (
        <span
          aria-hidden='true'
          className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-lg'
        >
          👤
        </span>
      )}
      <span className='flex min-w-0 flex-1 items-center gap-2 text-left'>
        <span className='truncate text-base font-semibold text-white sm:text-lg'>
          {voter.displayName || shortened(voter.address)}
        </span>
        {voter.isIssuer && (
          <span className='shrink-0 text-xs font-normal text-white/60'>(issuer)</span>
        )}
      </span>
      {voter.weightWei != null && (
        <span className='shrink-0 text-xs text-white/65'>
          {(Number(voter.weightWei) / 1e18).toLocaleString(undefined, {
            maximumFractionDigits: 6,
          })}{' '}
          ETH
        </span>
      )}
      <span aria-hidden='true' className='shrink-0 text-sm text-white/60 group-hover:text-white'>
        ↗
      </span>
    </a>
  );
}

function VoterSection({
  label,
  voters,
  explorer,
}: {
  label: string;
  voters: ClassifiedVoter[];
  explorer: string;
}) {
  return (
    <section className='min-w-0'>
      <h3 className='mb-2 flex items-center justify-between border-b border-white/15 pb-2 text-sm font-bold text-white'>
        <span>{label}</span>
        <span className='text-white/70'>{voters.length}</span>
      </h3>
      {voters.length ? (
        <div className='flex flex-col gap-0.5'>
          {voters.map((voter) => renderRow(voter, explorer))}
        </div>
      ) : (
        <p className='px-3 py-2 text-xs text-white/60'>none</p>
      )}
    </section>
  );
}

export default function VotingActivity({
  chainId,
  deadline,
  issuer,
  nominationTxHash,
  contributors,
  votes,
  className = '',
}: VotingActivityProps) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    // Change "has not voted" to "abstained" even when the page stays open.
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 15000);
    return () => clearInterval(interval);
  }, []);

  const explorer = EXPLORERS[chainId];
  const { yes, no, pending } = useMemo(() => {
    const issuerKey = issuer.toLowerCase();
    const byAddress = new Map<string, VotingActivityContributor>();
    for (const contributor of contributors) {
      const key = contributor.address.toLowerCase();
      if (/^0x[\da-f]{40}$/.test(key) && !byAddress.has(key)) {
        byAddress.set(key, contributor);
      }
    }
    // The issuer casts an automatic YES on nomination, even if the caller's
    // contributor list excludes the issuer's initial bounty funding.
    if (/^0x[\da-f]{40}$/.test(issuerKey) && !byAddress.has(issuerKey)) {
      byAddress.set(issuerKey, { address: issuer });
    }

    const voteByAddress = new Map<string, VotingActivityVote>();
    const orderedVotes = [...votes].sort(
      (a, b) => (a.blockNumber ?? 0) - (b.blockNumber ?? 0) ||
        (a.logIndex ?? 0) - (b.logIndex ?? 0)
    );
    for (const vote of orderedVotes) {
      const key = vote.address.toLowerCase();
      if (byAddress.has(key)) voteByAddress.set(key, vote);
    }

    const output: Record<'yes' | 'no' | 'pending', ClassifiedVoter[]> = {
      yes: [], no: [], pending: [],
    };
    for (const [key, contributor] of byAddress.entries()) {
      const record = voteByAddress.get(key);
      // Issuer's nomination is an automatic YES vote. If the contract ever
      // permits an explicit issuer vote later, take that recorded vote instead.
      const choice = record?.choice ?? (key === issuerKey ? 'yes' : 'pending');
      const transactionHash = record?.transactionHash ??
        (key === issuerKey && choice === 'yes' ? nominationTxHash ?? undefined : undefined);
      output[choice].push({
        ...contributor,
        choice,
        transactionHash,
        isIssuer: key === issuerKey,
      });
    }
    return output;
  }, [contributors, votes, issuer, nominationTxHash]);

  const elapsed = Number.isFinite(deadline) && now >= deadline;

  return (
    <details className={`group overflow-hidden rounded-2xl border border-white/20 bg-white/10 text-white ${className}`}>
      <summary className='flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-lg font-semibold marker:hidden sm:px-7 sm:text-xl [&::-webkit-details-marker]:hidden'>
        <span className='flex items-center gap-3'>
          <span aria-hidden='true'>🗳️</span>
          <span>voting activity</span>
        </span>
        <svg
          aria-hidden='true'
          width='22'
          height='22'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
          className='shrink-0 transition-transform group-open:rotate-180'
        >
          <path d='m6 9 6 6 6-6' />
        </svg>
      </summary>
      <div className='grid gap-6 border-t border-white/15 px-3 py-5 sm:px-6'>
        <VoterSection label='voted yes' voters={yes} explorer={explorer} />
        <VoterSection label='voted no' voters={no} explorer={explorer} />
        <VoterSection
          label={elapsed ? 'abstained' : 'has not voted'}
          voters={pending}
          explorer={explorer}
        />
      </div>
    </details>
  );
}
