'use client';

import { useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { trpc } from '@/trpc/client';
import { useSession } from '@/components/auth/SessionProvider';
import { SignInCancelledError } from '@/utils/sessionClient';
import { toastError } from '@/utils/errors';

type VoteValue = -1 | 0 | 1;

type IdeaSummary = {
  cid: string;
  upvotes: number;
  downvotes: number;
  score: number;
  commentCount: number;
  myVote: VoteValue;
};

type IdeaVoteProps = {
  cid: string;
  summary?: IdeaSummary;
};

export default function IdeaVote({
  cid,
  summary,
}: IdeaVoteProps) {
  const account = useAccount();
  const { openConnectModal } = useConnectModal();
  const { withSession } = useSession();
  const utils = trpc.useUtils();

  const [optimisticVote, setOptimisticVote] =
    useState<VoteValue | null>(null);

  const voteMutation = trpc.ideas.vote.useMutation();

  const savedVote = summary?.myVote ?? 0;
  const currentVote = optimisticVote ?? savedVote;

  // Reflect the selected vote immediately without waiting
  // for the server to return updated totals.
  const score =
    (summary?.score ?? 0) + currentVote - savedVote;

  const isPending =
    voteMutation.isPending || optimisticVote !== null;

  const handleVote = async (direction: -1 | 1) => {
    if (isPending) return;

    if (!account.address) {
      openConnectModal?.();
      return;
    }

    // Clicking the same arrow again removes the vote.
    const nextVote: VoteValue =
      currentVote === direction ? 0 : direction;

    setOptimisticVote(nextVote);

    try {
      await withSession(() =>
        voteMutation.mutateAsync({
          cid,
          value: nextVote,
        })
      );

      // Wait for fresh summaries before removing
      // the optimistic state to avoid score flickering.
      await utils.ideas.summaries.invalidate();
    } catch (error) {
      if (!(error instanceof SignInCancelledError)) {
        toastError('failed to vote on idea', error);
      }
    } finally {
      setOptimisticVote(null);
    }
  };

  return (
    <div className='flex w-9 shrink-0 flex-col items-center gap-1 pt-0.5'>
      <button
        type='button'
        aria-label='upvote idea'
        aria-pressed={currentVote === 1}
        disabled={isPending}
        onClick={() => void handleVote(1)}
        className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:cursor-wait ${
          currentVote === 1
            ? 'bg-poidhRed/20 text-poidhRed'
            : 'text-white/60 hover:bg-white/10 hover:text-white'
        }`}
      >
        <ArrowUp size={22} strokeWidth={2.5} />
      </button>

      <span
        className='min-w-8 text-center font-mono text-sm font-semibold tabular-nums text-white'
        aria-label={`${score} net votes`}
      >
        {score}
      </span>

      <button
        type='button'
        aria-label='downvote idea'
        aria-pressed={currentVote === -1}
        disabled={isPending}
        onClick={() => void handleVote(-1)}
        className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:cursor-wait ${
          currentVote === -1
            ? 'bg-poidhRed/20 text-poidhRed'
            : 'text-white/60 hover:bg-white/10 hover:text-white'
        }`}
      >
        <ArrowDown size={22} strokeWidth={2.5} />
      </button>
    </div>
  );
}
