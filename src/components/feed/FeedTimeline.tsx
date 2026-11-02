'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import InfiniteScroll from 'react-infinite-scroller';
import Activity from '@/components/feed/Activity';
import DraftActivity, { type PublicBountyDraft } from '@/components/feed/DraftActivity';

type OnchainActivity = {
  tx: string;
  index?: number | null;
  timestamp: number | string;
};

type RecentDraftsPage = {
  drafts: PublicBountyDraft[];
  nextOffset: number | null;
};

type TimelineItem =
  | { kind: 'onchain'; key: string; timestampMs: number; activity: OnchainActivity }
  | { kind: 'draft'; key: string; timestampMs: number; draft: PublicBountyDraft };

async function fetchDrafts({ pageParam }: { pageParam: number }): Promise<RecentDraftsPage> {
  const response = await fetch(`/api/bounty-drafts/recent?offset=${pageParam}`);
  if (!response.ok) throw new Error('Could not load public draft activity');

  const data: RecentDraftsPage = await response.json();
  if (!Array.isArray(data.drafts)) throw new Error('Invalid public draft activity response');
  return data;
}

export default function FeedTimeline({
  activities,
  isYouFeed,
  hasNextActivity,
  isFetchingNextActivity,
  onLoadMoreActivity,
}: {
  activities: OnchainActivity[];
  isYouFeed: boolean;
  hasNextActivity: boolean;
  isFetchingNextActivity: boolean;
  onLoadMoreActivity: () => Promise<void>;
}) {
  const publicDrafts = useInfiniteQuery({
    queryKey: ['poidh-public-feed-drafts'],
    queryFn: ({ pageParam }) => fetchDrafts({ pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    enabled: !isYouFeed,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  const rawDraftItems = isYouFeed || publicDrafts.isError
    ? []
    : (publicDrafts.data?.pages.flatMap((page) => page.drafts) ?? []);
  // Offset pages can overlap if a new draft is saved while scrolling.
  const seenCids = new Set<string>();
  const draftItems = rawDraftItems.filter((draft) => {
    if (seenCids.has(draft.cid)) return false;
    seenCids.add(draft.cid);
    return true;
  });
  const hasNextDraft = !isYouFeed && !publicDrafts.isError && !!publicDrafts.hasNextPage;

  const onchainItems: TimelineItem[] = activities.map((activity) => ({
    kind: 'onchain',
    key: `tx:${activity.tx}:${activity.index ?? ''}`,
    timestampMs: Number(activity.timestamp) * 1000,
    activity,
  }));
  const ipfsItems: TimelineItem[] = draftItems.map((draft) => ({
    kind: 'draft',
    key: `draft:${draft.cid}`,
    timestampMs: Date.parse(draft.createdAt),
    draft,
  }));

  // Only reveal times covered by BOTH data sources. Without this bound, a
  // draft from yesterday could appear ahead of onchain events that have not
  // yet been fetched, breaking chronological order while scrolling.
  const oldestActivity = onchainItems.length
    ? Math.min(...onchainItems.map((item) => item.timestampMs))
    : Infinity;
  const oldestDraft = ipfsItems.length
    ? Math.min(...ipfsItems.map((item) => item.timestampMs))
    : Infinity;
  const activityBoundary = hasNextActivity ? oldestActivity : -Infinity;
  const draftBoundary = hasNextDraft ? oldestDraft : -Infinity;
  const completeThrough =
    isYouFeed ||
    publicDrafts.isError ||
    (ipfsItems.length === 0 && !hasNextDraft)
      ? -Infinity
      : Math.max(activityBoundary, draftBoundary);

  const visible = [...onchainItems, ...ipfsItems]
    .filter((item) => Number.isFinite(item.timestampMs) && item.timestampMs > completeThrough)
    .sort((a, b) => b.timestampMs - a.timestampMs || a.key.localeCompare(b.key));

  const hasMore = hasNextActivity || hasNextDraft;
  const loadingNext = isFetchingNextActivity || publicDrafts.isFetchingNextPage;

  const loadMore = async () => {
    if (loadingNext || publicDrafts.isLoading) return;

    // Advance whichever cursor is limiting the visible chronological range.
    if (hasNextDraft && (!hasNextActivity || oldestDraft >= oldestActivity)) {
      await publicDrafts.fetchNextPage();
    } else if (hasNextActivity) {
      await onLoadMoreActivity();
    } else if (hasNextDraft) {
      await publicDrafts.fetchNextPage();
    }
  };

  if (!isYouFeed && publicDrafts.isLoading) {
    return <div className='text-white/60 py-8 text-center'>Loading activity...</div>;
  }

  return (
    <div className='w-full'>
      {!isYouFeed && publicDrafts.isError && (
        <div className='text-center text-sm text-white/60 py-3'>
          Draft activity is temporarily unavailable; showing onchain activity.
        </div>
      )}
      {visible.length === 0 && !hasMore && (
        <div className='text-white/60 text-center py-8'>No recent activity</div>
      )}
      <InfiniteScroll
        loadMore={loadMore}
        hasMore={hasMore && !loadingNext}
        loader={
          <div key='loader' className='animate-pulse text-center py-4 text-white/60'>
            Loading more...
          </div>
        }
        threshold={500}
      >
        <div className='w-full flex flex-col items-center gap-4'>
          {visible.map((item) =>
            item.kind === 'draft' ? (
              <DraftActivity key={item.key} draft={item.draft} />
            ) : (
              <Activity key={item.key} activity={item.activity as any} />
            )
          )}
        </div>
      </InfiniteScroll>
      {loadingNext && (
        <div className='animate-pulse text-center py-4 text-white/60'>Loading more...</div>
      )}
    </div>
  );
}
