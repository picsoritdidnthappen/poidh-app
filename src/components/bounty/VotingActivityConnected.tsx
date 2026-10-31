'use client';

import { useEffect, useMemo, useState } from 'react';
import { decodeEventLog, decodeFunctionData } from 'viem';
import abi from '@/constant/abi/abi';
import { trpc } from '@/trpc/client';
import { useChainInfo } from '@/hooks/useChainInfo';
import VotingActivity, {
  type VotingActivityVote,
  type VotingActivityUnverifiedVote,
} from './VotingActivity';

const TX_HASH = /^0x[a-fA-F0-9]{64}$/;
const SUPPORTED_CHAINS = [1, 8453, 42161];

const pause = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

type LoadedActivity = {
  key: string;
  nominationTxHash: string;
  votes: VotingActivityVote[];
  unverified: VotingActivityUnverifiedVote[];
};

function StatusBar({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className='mt-5 w-full rounded-lg border border-white/20 bg-[#D1ECFF]/10 backdrop-blur-sm'>
      <div className='flex min-h-12 items-center justify-between gap-3 px-5 py-3'>
        <span className='flex items-center gap-2'>
          <span aria-hidden='true'>🗳️</span>
          <span>voting activity</span>
        </span>
        <span className='text-xs text-white/60'>{message}</span>
      </div>
      {onRetry && (
        <div className='border-t border-white/10 px-5 py-3 text-sm'>
          <button type='button' onClick={onRetry} className='underline hover:no-underline'>
            retry loading
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * poidh indexes voter and transaction hash, but does not index YES/NO.
 * Decode each current-round voteClaim transaction to identify the choice.
 * Failed decodes are explicitly unverified, never silently marked abstained.
 */
export default function VotingActivityConnected({ bountyId }: { bountyId: number }) {
  const chain = useChainInfo();
  const chainId = chain.id;
  const provider = chain.provider;
  const mainContract = chain.contracts.mainContract.toLowerCase();

  const bounty = trpc.bounties.fetch.useQuery({ id: bountyId, chainId });
  const voting = trpc.bounties.fetchVoting.useQuery({ bountyId, chainId });
  const contributors = trpc.bounties.participations.useQuery({ bountyId, chainId });
  const transactions = trpc.bounties.fetchTransactions.useQuery(
    { bountyId, chainId },
    { refetchInterval: 20_000 }
  );

  const [loaded, setLoaded] = useState<LoadedActivity | null>(null);
  const [retry, setRetry] = useState(0);

  const round = Number(voting.data?.round ?? 0);
  const onChainId = bounty.data?.onChainId;
  const txs = transactions.data;

  // Reuse the same round-start rule as poidh's accounts.canVote query.
  // Tx history is newest-first, so sort nomination transactions oldest-first.
  const roundData = useMemo(() => {
    if (!txs || round < 1) return null;
    const starts = txs
      .filter((tx) => tx.action.toLowerCase().includes('submitted for vote'))
      .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

    const start = starts[round - 1];
    if (!start) return null;
    const nextStart = starts[round];

    const voteTxs = txs.filter(
      (tx) =>
        tx.action.toLowerCase() === 'voted' &&
        Number(tx.timestamp) > Number(start.timestamp) &&
        (!nextStart || Number(tx.timestamp) < Number(nextStart.timestamp))
    );
    return { start, voteTxs };
  }, [txs, round]);

  const key = roundData && onChainId != null
    ? [
        chainId,
        bountyId,
        round,
        String(onChainId),
        roundData.start.tx,
        ...roundData.voteTxs.map((tx) => tx.tx).sort(),
        retry,
      ].join(':')
    : '';

  useEffect(() => {
    // Capture these as local constants BEFORE creating nested async functions.
    // This preserves TypeScript's non-null narrowing across await boundaries.
    const currentRound = roundData;
    const currentOnChainId = onChainId;
    const currentKey = key;
    if (!currentRound || currentOnChainId == null || !currentKey) return;

    const nominationTxHash = currentRound.start.tx;
    const voteTxs = currentRound.voteTxs;
    const expectedBountyId = BigInt(currentOnChainId);
    let canceled = false;

    const readVote = async (record: (typeof voteTxs)[number]): Promise<VotingActivityVote> => {
      if (!TX_HASH.test(record.tx)) {
        throw new Error('Invalid indexed vote transaction hash');
      }
      const hash = record.tx as `0x${string}`;
      let lastError: unknown;

      // Retry transient RPC failures. Never guess the direction of a vote.
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const transaction = await provider.getTransaction({ hash });
          if (transaction.to?.toLowerCase() === mainContract) {
            try {
              const call = decodeFunctionData({ abi, data: transaction.input });
              const args = call.args as readonly unknown[] | undefined;
              if (
                call.functionName === 'voteClaim' &&
                args?.length === 2 &&
                BigInt(args[0] as string | number | bigint) === expectedBountyId &&
                typeof args[1] === 'boolean'
              ) {
                return {
                  address: record.address,
                  choice: args[1] ? 'yes' : 'no',
                  transactionHash: hash,
                  blockNumber: Number(transaction.blockNumber ?? 0),
                  transactionIndex: Number(transaction.transactionIndex ?? 0),
                };
              }
            } catch {
              // If this is a wrapped call, check the receipt for a vote event.
            }
          }

          const receipt = await provider.getTransactionReceipt({ hash });
          for (const log of receipt.logs) {
            if (log.address.toLowerCase() !== mainContract) continue;
            try {
              const parsed = decodeEventLog({
                abi,
                topics: log.topics,
                data: log.data,
                strict: false,
              });
              if (!/vote/i.test(parsed.eventName)) continue;

              const fields = (parsed.args ?? {}) as unknown as Record<string, unknown>;
              const bountyField = fields.bountyId ?? fields._bountyId ?? fields.id;
              if (
                bountyField == null ||
                BigInt(bountyField as string | number | bigint) !== expectedBountyId
              ) {
                continue;
              }
              const approve =
                fields.approve ?? fields.vote ?? fields.support ??
                fields.votedYes ?? fields.yes;
              if (typeof approve === 'boolean') {
                return {
                  address: record.address,
                  choice: approve ? 'yes' : 'no',
                  transactionHash: hash,
                  blockNumber: Number(receipt.blockNumber),
                  transactionIndex: Number(receipt.transactionIndex),
                };
              }
            } catch {
              // Ignore unrelated or undecodable contract events.
            }
          }
          throw new Error('Vote direction not available from transaction input or logs');
        } catch (error) {
          lastError = error;
          if (attempt < 2) await pause(400 * (attempt + 1));
        }
      }
      throw lastError;
    };

    const load = async () => {
      const votes: VotingActivityVote[] = [];
      const unverified: VotingActivityUnverifiedVote[] = [];

      // Limit concurrent RPC calls for large bounties.
      for (let i = 0; i < voteTxs.length; i += 3) {
        if (canceled) return;
        const batch = voteTxs.slice(i, i + 3);
        const results = await Promise.allSettled(batch.map(readVote));
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            votes.push(result.value);
          } else {
            const record = batch[index];
            if (!record) return;
            console.warn('[voting activity] Vote could not be verified:', record.tx, result.reason);
            unverified.push({
              address: record.address,
              transactionHash: record.tx,
            });
          }
        });
      }

      if (!canceled) {
        setLoaded({ key: currentKey, nominationTxHash, votes, unverified });
      }
    };

    void load().catch((error) => {
      // Unexpected errors should not turn known vote transactions into abstentions.
      console.error('[voting activity] Unable to load votes:', error);
      if (!canceled) {
        setLoaded({
          key: currentKey,
          nominationTxHash,
          votes: [],
          unverified: voteTxs.map((tx) => ({ address: tx.address, transactionHash: tx.tx })),
        });
      }
    });

    return () => {
      canceled = true;
    };
  }, [key, roundData, onChainId, provider, mainContract]);

  const reload = () => {
    setRetry((value) => value + 1);
    void bounty.refetch();
    void voting.refetch();
    void contributors.refetch();
    void transactions.refetch();
  };

  if (bounty.isError || voting.isError || contributors.isError || transactions.isError) {
    return <StatusBar message='unable to load' onRetry={reload} />;
  }
  if (
    !bounty.data || !voting.data || !contributors.data || !txs ||
    !SUPPORTED_CHAINS.includes(chainId)
  ) {
    return <StatusBar message='loading...' />;
  }
  if (!roundData) {
    return <StatusBar message='waiting for voting history...' onRetry={reload} />;
  }
  if (!loaded || loaded.key !== key) {
    return <StatusBar message='verifying votes...' />;
  }

  return (
    <VotingActivity
      chainId={chainId as 1 | 42161 | 8453}
      deadline={Number(bounty.data.deadline ?? 0)}
      issuer={bounty.data.issuer}
      nominationTxHash={loaded.nominationTxHash}
      contributors={contributors.data.map((contributor) => ({
        address: contributor.userAddress,
        weightWei: String(contributor.amount),
      }))}
      votes={loaded.votes}
      unverified={loaded.unverified}
      onRetry={reload}
    />
  );
}
