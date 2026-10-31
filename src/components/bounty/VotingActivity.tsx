'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatEther } from 'viem';
import { ExpandMoreIcon } from '@/components/global/Icons';
import { cn } from '@/utils/utils';
import CopyAddressButton from '@/components/global/CopyAddressButton';
import DisplayAddress from '@/components/global/DisplayAddress';

export type VotingActivityContributor = {
  address: string;
  weightWei?: string;
};

export type VotingActivityUnverifiedVote = {
  address: string;
  transactionHash: string;
};

export type VotingActivityVote = {
  address: string;
  choice: 'yes' | 'no';
  transactionHash: string;
  blockNumber?: number;
  transactionIndex?: number;
};

type Props = {
  chainId: 1 | 42161 | 8453;
  deadline: number; // Unix seconds
  issuer: string;
  nominationTxHash?: string | null;
  contributors: VotingActivityContributor[];
  votes: VotingActivityVote[];
  unverified?: VotingActivityUnverifiedVote[];
  onRetry?: () => void;
};

type Voter = VotingActivityContributor & {
  isIssuer: boolean;
  choice: 'yes' | 'no' | 'pending' | 'unverified';
  transactionHash?: string;
};

const EXPLORERS: Record<Props['chainId'], string> = {
  1: 'https://etherscan.io',
  42161: 'https://arbiscan.io',
  8453: 'https://basescan.org',
};

function isHash(value: unknown): value is string {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{64}$/.test(value);
}

function VoterRow({ voter, explorer }: { voter: Voter; explorer: string }) {
  const txUrl = isHash(voter.transactionHash)
    ? `${explorer}/tx/${voter.transactionHash}`
    : null;
  const href = txUrl ?? `${explorer}/address/${voter.address}`;

  return (
    <div className='group relative flex items-center p-4 hover:bg-[#D1ECFF]/10 transition-all'>
      {/* A full-row explorer link, with a separate accessible copy control. */}
      <a
        href={href}
        target='_blank'
        rel='noopener noreferrer'
        className='absolute inset-0 z-0'
        aria-label={`${txUrl ? 'View vote transaction' : 'View wallet address'} for ${voter.address}`}
      />
      <div className='pointer-events-none relative z-10 flex min-w-0 w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-4'>
        <div className='flex min-w-0 items-center gap-1 sm:min-w-[200px]'>
          <span className='pointer-events-auto relative z-20 mr-1 shrink-0'>
            <CopyAddressButton address={voter.address} size={12} />
          </span>
          <div className='min-w-0'>
            <DisplayAddress address={voter.address} />
          </div>
          {voter.isIssuer && (
            <span className='ml-1 shrink-0 text-xs text-white/60'>(issuer)</span>
          )}
        </div>
        {voter.weightWei !== undefined && (
          <div className='text-sm text-white/60'>
            {formatEther(BigInt(voter.weightWei))} eth
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  rows,
  explorer,
}: {
  title: string;
  rows: Voter[];
  explorer: string;
}) {
  return (
    <section>
      <div className='flex items-center justify-between px-4 py-3 bg-white/5 text-sm font-semibold'>
        <span>{title}</span>
        <span className='text-white/60'>{rows.length}</span>
      </div>
      <div className='divide-y divide-white/10'>
        {rows.length === 0 ? (
          <div className='p-4 text-sm text-white/60'>none</div>
        ) : (
          rows.map((row) => <VoterRow key={row.address.toLowerCase()} voter={row} explorer={explorer} />)
        )}
      </div>
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
  unverified = [],
  onRetry,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 15_000);
    return () => clearInterval(interval);
  }, []);

  const { yes, no, pending, unknown } = useMemo(() => {
    const issuerKey = issuer.toLowerCase();
    const byAddress = new Map<string, VotingActivityContributor>();
    for (const participant of contributors) {
      const address = participant.address.toLowerCase();
      if (/^0x[a-f0-9]{40}$/.test(address) && !byAddress.has(address)) {
        byAddress.set(address, participant);
      }
    }
    if (/^0x[a-f0-9]{40}$/.test(issuerKey) && !byAddress.has(issuerKey)) {
      byAddress.set(issuerKey, { address: issuer });
    }

    const unverifiedByAddress = new Map(unverified.map((record) => [record.address.toLowerCase(), record]));
    // Include historical voters who are missing from today's contributor list.
    for (const entry of [...votes, ...unverified]) {
      const key = entry.address.toLowerCase();
      if (/^0x[a-f0-9]{40}$/.test(key) && !byAddress.has(key)) {
        byAddress.set(key, { address: entry.address });
      }
    }

    const voteByAddress = new Map<string, VotingActivityVote>();
    const ordered = [...votes].sort(
      (a, b) =>
        (a.blockNumber ?? 0) - (b.blockNumber ?? 0) ||
        (a.transactionIndex ?? 0) - (b.transactionIndex ?? 0)
    );
    for (const vote of ordered) {
      const address = vote.address.toLowerCase();
      if (byAddress.has(address)) voteByAddress.set(address, vote);
    }

    const result: Record<'yes' | 'no' | 'pending' | 'unknown', Voter[]> = { yes: [], no: [], pending: [], unknown: [] };
    for (const [address, person] of byAddress.entries()) {
      const explicitVote = voteByAddress.get(address);
      const unknownVote = unverifiedByAddress.get(address);
      const choice = explicitVote?.choice ?? (address === issuerKey ? 'yes' : unknownVote ? 'unverified' : 'pending');
      result[choice === 'unverified' ? 'unknown' : choice].push({
        ...person,
        isIssuer: address === issuerKey,
        choice,
        transactionHash: explicitVote?.transactionHash ?? unknownVote?.transactionHash ??
          (address === issuerKey && choice === 'yes' ? nominationTxHash ?? undefined : undefined),
      });
    }
    return result;
  }, [contributors, votes, unverified, issuer, nominationTxHash]);

  const explorer = EXPLORERS[chainId];
  const hasEnded = deadline > 0 && now >= deadline;

  return (
    <div className='w-full border border-white/20 rounded-lg backdrop-blur-sm bg-[#D1ECFF]/10 mt-5 overflow-hidden'>
      <button
        type='button'
        onClick={() => setExpanded((previous) => !previous)}
        aria-expanded={expanded}
        className='w-full px-5 py-3 flex justify-between items-center hover:bg-[#D1ECFF]/10 transition-all'
      >
        <span className='flex items-center gap-2'>
          <span aria-hidden='true'>🗳️</span>
          voting activity
        </span>
        <span className={cn('transition-transform duration-200', expanded ? 'rotate-180' : '')}>
          <ExpandMoreIcon size={16} />
        </span>
      </button>
      {expanded && (
        <div className='divide-y divide-white/10'>
          <Section title='voted yes' rows={yes} explorer={explorer} />
          <Section title='voted no' rows={no} explorer={explorer} />
          <Section title={hasEnded ? 'abstained' : 'has not voted'} rows={pending} explorer={explorer} />
          {unknown.length > 0 && (
            <section>
              <div className='flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-white/5 text-sm'>
                <span>vote recorded — direction unavailable ({unknown.length})</span>
                {onRetry && (
                  <button type='button' className='underline hover:no-underline' onClick={onRetry}>retry verification</button>
                )}
              </div>
              <div className='divide-y divide-white/10'>
                {unknown.map((row) => <VoterRow key={row.address.toLowerCase()} voter={row} explorer={explorer} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
