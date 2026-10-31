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

type Activity = {
  key: string;
  nominationTxHash: string;
  votes: VotingActivityVote[];
  unverified: VotingActivityUnverifiedVote[];
};

const TX_HASH = /^0x[a-f0-9]{64}$/i;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Indexed transactions identify who voted, but not the direction. Read the
 * chain to classify YES and NO. If a transaction cannot be decoded, never
 * mislabel its wallet as "has not voted" / "abstained".
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
  const [activity, setActivity] = useState<Activity | null>(null);
  const [retry, setRetry] = useState(0);

  const round = Number(voting.data?.round ?? 0);
  const onChainId = bounty.data?.onChainId;
  const txs = transactions.data;
  const roundData = useMemo(() => {
    if (!txs || round < 1) return null;
    const starts = txs
      .filter((tx) => tx.action.toLowerCase().includes('submitted for vote'))
      .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
    const start = starts[round - 1];
    if (!start) return null;
    const nextStart = starts[round];
    const voteTxs = txs.filter((tx) =>
      tx.action.toLowerCase() === 'voted' &&
      Number(tx.timestamp) > Number(start.timestamp) &&
      (!nextStart || Number(tx.timestamp) < Number(nextStart.timestamp))
    );
    return { start, voteTxs };
  }, [txs, round]);

  const key = roundData && onChainId != null
    ? `${chainId}:${bountyId}:${round}:${String(onChainId)}:${roundData.start.tx}:${roundData.voteTxs.map((tx) => tx.tx).sort().join(',')}:${retry}`
    : '';

  useEffect(() => {
    if (!roundData || onChainId == null || !key) return;
    let canceled = false;

    const readVote = async (record: (typeof roundData.voteTxs)[number]) => {
      if (!TX_HASH.test(record.tx)) throw new Error('Invalid indexed transaction hash');
      const hash = record.tx as `0x${string}`;
      let lastError: unknown;

      // A public RPC may be momentarily rate limited or still indexing a tx.
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const tx = await provider.getTransaction({ hash });
          if (tx.to?.toLowerCase() === mainContract) {
            try {
              const call = decodeFunctionData({ abi, data: tx.input });
              const args = call.args as readonly unknown[] | undefined;
              if (call.functionName === 'voteClaim' && args?.length === 2 &&
                  BigInt(args[0] as string | number | bigint) === BigInt(onChainId) &&
                  typeof args[1] === 'boolean') {
                return {
                  address: record.address,
                  choice: args[1] ? 'yes' as const : 'no' as const,
                  transactionHash: hash,
                  blockNumber: Number(tx.blockNumber ?? 0),
                  transactionIndex: Number(tx.transactionIndex ?? 0),
                };
              }
            } catch {
              // Fall through to receipt logs when calldata decoding fails.
            }
          }

          // Some wallet transactions may wrap a contract call. If this ABI
          // exposes a usable vote event, classify only from an exact match.
          const receipt = await provider.getTransactionReceipt({ hash });
          for (const log of receipt.logs) {
            if (log.address.toLowerCase() !== mainContract) continue;
            try {
              const parsed = decodeEventLog({
                abi, topics: log.topics, data: log.data, strict: false,
              });
              if (!/vote/i.test(parsed.eventName)) continue;
              const args = (parsed.args ?? {}) as unknown as Record<string, unknown>;
              const eventBounty = args.bountyId ?? args._bountyId ?? args.id;
              if (eventBounty == null || BigInt(eventBounty as string | number | bigint) !== BigInt(onChainId)) continue;
              const choice = args.approve ?? args.vote ?? args.support ?? args.votedYes ?? args.yes;
              if (typeof choice === 'boolean') {
                return {
                  address: record.address,
                  choice: choice ? 'yes' as const : 'no' as const,
                  transactionHash: hash,
                  blockNumber: Number(receipt.blockNumber),
                  transactionIndex: Number(receipt.transactionIndex),
                };
              }
            } catch {
              // An unrelated contract log must not fail the entire vote read.
            }
          }
          throw new Error('Vote direction could not be verified from transaction input or events');
        } catch (error) {
          lastError = error;
          if (attempt < 2) await wait(450 * (attempt + 1));
        }
      }
      throw lastError;
    };

    async function load() {
      const votes: VotingActivityVote[] = [];
      const unverified: VotingActivityUnverifiedVote[] = [];
      // Restrict concurrency to keep public RPC usage under control.
      for (let i = 0; i < roundData.voteTxs.length; i += 3) {
        const batch = roundData.voteTxs.slice(i, i + 3);
        const settled = await Promise.allSettled(batch.map(readVote));
        settled.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            votes.push(result.value);
          } else {
            const record = batch[index];
            console.warn('[voting activity] Could not verify vote', record.tx, result.reason);
            unverified.push({ address: record.address, transactionHash: record.tx });
          }
        });
      }
      if (!canceled) setActivity({ key, nominationTxHash: roundData.start.tx, votes, unverified });
    }
    void load();
    return () => { canceled = true; };
  }, [key, roundData, onChainId, provider, mainContract]);

  if (bounty.isError || voting.isError || contributors.isError || transactions.isError) {
    return <p className='mt-4 text-sm text-white/60'>unable to load voting activity data</p>;
  }
  if (!bounty.data || !voting.data || !contributors.data || !txs || !roundData ||
      ![1, 8453, 42161].includes(chainId)) {
    return <p className='mt-4 text-sm text-white/60'>loading voting activity...</p>;
  }
  if (!activity || activity.key !== key) {
    return <p className='mt-4 text-sm text-white/60'>loading voting activity...</p>;
  }

  return (
    <VotingActivity
      chainId={chainId as 1 | 42161 | 8453}
      deadline={Number(bounty.data.deadline ?? 0)}
      issuer={bounty.data.issuer}
      nominationTxHash={activity.nominationTxHash}
      contributors={contributors.data.map((contributor) => ({
        address: contributor.userAddress,
        weightWei: String(contributor.amount),
      }))}
      votes={activity.votes}
      unverified={activity.unverified}
      onRetry={() => setRetry((value) => value + 1)}
    />
  );
}
