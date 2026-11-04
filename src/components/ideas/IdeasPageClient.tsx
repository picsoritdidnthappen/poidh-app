'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { MessageSquare } from 'lucide-react';
import { useAccount } from 'wagmi';
import { trpc } from '@/trpc/client';
import FormBounty from '@/components/bounty/FormBounty';
import IdeaVote from './IdeaVote';
import type { PublicBountyDraft } from '@/components/feed/DraftActivity';
import DisplayAddress from '@/components/global/DisplayAddress';

type DraftPage = {
  drafts: PublicBountyDraft[];
  nextOffset: number | null;
};

async function fetchDraftPage(offset: number): Promise<DraftPage> {
  const response = await fetch(
    `/api/bounty-drafts/recent?offset=${offset}`
  );

  if (!response.ok) {
    throw new Error('could not load ideas');
  }

  const data = (await response.json()) as DraftPage;

  if (!Array.isArray(data.drafts)) {
    throw new Error('invalid ideas response');
  }

  return data;
}

export default function IdeasPageClient() {
  const [formOpen, setFormOpen] = useState(false);
  const account = useAccount();

  const list = useInfiniteQuery({
    queryKey: ['poidh-ideas-list'],
    queryFn: ({ pageParam }) => fetchDraftPage(pageParam),
    initialPageParam: 0,
    getNextPageParam: (page) => page.nextOffset ?? undefined,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  const all =
    list.data?.pages.flatMap((page) => page.drafts) ?? [];

  const seen = new Set<string>();

  const ideas = all.filter((item) => {
    if (seen.has(item.cid)) return false;

    seen.add(item.cid);
    return true;
  });

  const summaries = trpc.ideas.summaries.useQuery(
    {
      cids: ideas.slice(0, 200).map((item) => item.cid),
      viewer: account.address?.toLowerCase(),
    },
    {
      enabled: ideas.length > 0,
      staleTime: 15_000,
      refetchOnWindowFocus: true,
    }
  );

  const stats = new Map(
    (summaries.data ?? []).map(
      (item) => [item.cid, item] as const
    )
  );

  // Rank loaded ideas by upvotes, then downvotes,
  // then creation date.
  const rankedIdeas = [...ideas].sort((a, b) => {
    const aStats = stats.get(a.cid);
    const bStats = stats.get(b.cid);

    const aUpvotes = aStats?.upvotes ?? 0;
    const bUpvotes = bStats?.upvotes ?? 0;

    if (aUpvotes !== bUpvotes) {
      return bUpvotes - aUpvotes;
    }

    const aDownvotes = aStats?.downvotes ?? 0;
    const bDownvotes = bStats?.downvotes ?? 0;

    if (aDownvotes !== bDownvotes) {
      return aDownvotes - bDownvotes;
    }

    return (
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
    );
  });

  const isRanking = ideas.length > 0 && summaries.isLoading;

  return (
    <div className='min-h-screen pb-24 text-white normal-case'>
      <main className='mx-auto max-w-3xl px-4 pt-12 sm:px-6'>
        <div className='mb-8 flex items-start justify-between gap-4'>
          <div>
            <h1 className='font-mono text-3xl font-bold normal-case'>
              ideas
            </h1>

            <p className='mt-2 text-sm text-white/70'>
              things people want to see happen
            </p>
          </div>

          <button
            type='button'
            onClick={() => setFormOpen(true)}
            className='shrink-0 rounded-lg bg-poidhRed px-4 py-2 text-sm font-semibold hover:opacity-90'
          >
            + post an idea
          </button>
        </div>

        <p className='mb-5 text-xs text-white/60'>
          use “or save as draft” in the form — posting an idea
          does not fund a bounty
        </p>

        {list.isLoading && (
          <p className='py-10 text-center text-white/70'>
            loading...
          </p>
        )}

        {isRanking && (
          <p className='py-6 text-center text-white/70'>
            ranking ideas...
          </p>
        )}

        {list.isError && (
          <p role='alert' className='py-10 text-white/70'>
            could not load ideas. try refreshing.
          </p>
        )}

        {!isRanking && (
          <div className='overflow-hidden rounded-xl border border-white/20 bg-black/10'>
            {rankedIdeas.map((idea) => (
              <article
                key={idea.cid}
                className='flex gap-3 border-b border-white/15 p-4 last:border-b-0 sm:gap-5 sm:p-5'
              >
                <IdeaVote
                  cid={idea.cid}
                  summary={stats.get(idea.cid)}
                />

                <div className='min-w-0 flex-1 pt-1'>
                  <Link
                    href={`/d/${idea.cid}`}
                    className='font-mono text-base font-semibold break-words hover:underline sm:text-lg'
                  >
                    {idea.title}
                  </Link>

                  <div className='mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/65'>                 
                    <div className='min-w-0'>
                      <DisplayAddress
                        address={idea.creator}
                        pfpSize={24}
                        showPfpIfExists
                        showFallbackPfp
                        showLoadingSkeleton
                      />
                    </div>

                    <span>
                      {new Date(
                        idea.createdAt
                      ).toLocaleDateString()}
                    </span>

                    <Link
                      href={`/d/${idea.cid}#ideas-comments`}
                      className='inline-flex items-center gap-1 hover:underline'
                    >
                      <MessageSquare size={14} />
                      {stats.get(idea.cid)?.commentCount ?? 0}{' '}
                      comments
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {list.hasNextPage && (
          <div className='mt-6 text-center'>
            <button
              type='button'
              disabled={list.isFetchingNextPage}
              onClick={() => void list.fetchNextPage()}
              className='rounded-lg border border-white/30 px-5 py-2 text-sm hover:bg-white/10 disabled:opacity-50'
            >
              {list.isFetchingNextPage
                ? 'loading...'
                : 'load more ideas'}
            </button>
          </div>
        )}

        {!list.isLoading &&
          !list.isError &&
          ideas.length === 0 && (
            <p className='py-10 text-center text-sm text-white/70'>
              no ideas yet
            </p>
          )}
      </main>

      <FormBounty
        open={formOpen}
        onClose={() => setFormOpen(false)}
      />
    </div>
  );
}
