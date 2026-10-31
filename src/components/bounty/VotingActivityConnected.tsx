'use client';

import { useEffect, useMemo, useState } from 'react';
import { decodeFunctionData } from 'viem';
import abi from '@/constant/abi/abi';
import { trpc } from '@/trpc/client';
import { useChainInfo } from '@/hooks/useChainInfo';
import VotingActivity, {
  type VotingActivityVote,
} from '@/components/bounty/VotingActivity';

type LoadedActivity = {
  key: string;
  nominationTxHash: string;
  votes: VotingActivityVote[];
};

/**
 * Reads the existing poidh transactions index, then decodes each onchain
 * voteClaim(bountyId, approve) transaction for the CURRENT voting round.
 * Indexed transaction.action === 'voted' does not indicate yes vs no.
 * Never classify failed/undecoded votes as abstentions.
 */
export default function VotingActivityConnected({ bountyId }: { bountyId: number }) {
  const chain = useChainInfo();
  const bounty = trpc.bounties.fetch.useQuery({ id: bountyId, chainId: chain.id });
  const voting = trpc.bounties.fetchVoting.useQuery({ bountyId, chainId: chain.id });
  const contributors = trpc.bounties.participations.useQuery({ bountyId, chainId: chain.id });
  const transactions = trpc.bounties.fetchTransactions.useQuery(
    { bountyId, chainId: chain.id },
    { refetchInterval: 20_000 }
  );

  const [activity, setActivity] = useState<LoadedActivity | null>(null);
  const [error, setError] = useState(false);

  const round = Number(voting.data?.round ?? 0);
  const onChainId = bounty.data?.onChainId;
  const txs = transactions.data;

  // Transaction histories in poidh are newest-first. Pick this round's
  // nomination, not an older round's votes, and keep its transaction hash.
  const roundData = useMemo(() => {
    if (!txs || round < 1) return null;
    const starts = txs
      .filter((tx) => tx.action.toLowerCase().includes('submitted for vote'))
      .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
    const start = starts[round - 1];
    if (!start) return null;
    const votingTxs = txs.filter(
      (tx) => tx.action.toLowerCase() === 'voted' &&
        Number(tx.timestamp) >= Number(start.timestamp)
    );
    return { start, votingTxs };
  }, [txs, round]);

  const key = roundData && onChainId != null
    ? `${chain.id}:${bountyId}:${round}:${String(onChainId)}:${roundData.start.tx}:${roundData.votingTxs.map((tx) => tx.tx).sort().join(',')}`
    : '';

  useEffect(() => {
    if (!roundData || onChainId == null || !key) return;
    let canceled = false;
    setError(false);

    async function decode() {
      if (!roundData || onChainId == null) return;
      const results: VotingActivityVote[] = [];
      // Bound concurrency to keep public RPCs from being flooded on large bounties.
      for (let offset = 0; offset < roundData.votingTxs.length; offset += 5) {
        const batch = roundData.votingTxs.slice(offset, offset + 5);
        const decoded = await Promise.all(batch.map(async (record): Promise<VotingActivityVote> => {
          if (!/^0x[a-f0-9]{64}$/i.test(record.tx)) throw new Error('Invalid indexed vote transaction hash');
          const transaction = await chain.provider.getTransaction({ hash: record.tx as `0x${string}` });
          if (transaction.to?.toLowerCase() !== chain.contracts.mainContract.toLowerCase()) {
            throw new Error('Vote transaction sent to unexpected contract');
          }
          const call = decodeFunctionData({ abi, data: transaction.input });
          const args = call.args as readonly unknown[] | undefined;
          if (call.functionName !== 'voteClaim' || !args || args.length < 2 ||
              BigInt(args[0] as string | number | bigint) !== BigInt(onChainId)) {
            throw new Error('Indexed vote is not a voteClaim for this bounty');
          }
          if (typeof args[1] !== 'boolean') throw new Error('Invalid onchain vote value');
          return {
            address: transaction.from,
            choice: args[1] ? 'yes' : 'no',
            transactionHash: transaction.hash,
            blockNumber: Number(transaction.blockNumber ?? 0),
            transactionIndex: Number(transaction.transactionIndex ?? 0),
          };
        }));
        results.push(...decoded);
      }
      if (!canceled) {
        setActivity({ key, nominationTxHash: roundData.start.tx, votes: results });
      }
    }

    void decode().catch((reason) => {
      if (!canceled) {
        console.error('[voting activity] Unable to decode indexed vote transactions:', reason);
        setError(true);
      }
    });
    return () => { canceled = true; };
  }, [roundData, onChainId, key, chain]);

  if (!bounty.data || !voting.data || !contributors.data || !txs || !roundData ||
      ![1, 8453, 42161].includes(chain.id)) {
    return <div className='mt-4 text-sm text-white/60'>loading voting activity...</div>;
  }

  if (error) {
    return <div className='mt-4 text-sm text-white/60'>voting activity temporarily unavailable</div>;
  }

  if (!activity || activity.key !== key) {
    return <div className='mt-4 text-sm text-white/60'>loading voting activity...</div>;
  }

  return (
    <VotingActivity
      chainId={chain.id as 1 | 42161 | 8453}
      deadline={Number(bounty.data.deadline ?? 0)}
      issuer={bounty.data.issuer}
      nominationTxHash={activity.nominationTxHash}
      contributors={contributors.data.map((contributor) => ({
        address: contributor.userAddress,
        weightWei: String(contributor.amount),
      }))}
      votes={activity.votes}
    />
  );
}
