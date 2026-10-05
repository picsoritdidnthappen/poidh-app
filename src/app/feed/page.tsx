'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/utils/utils';
import { EarthIcon, YouIcon } from '@/components/global/Icons';
import Activity from '@/components/feed/Activity';
import { trpc } from '@/trpc/client';
import { useAccount } from 'wagmi';
import InfiniteScroll from 'react-infinite-scroller';
import Navbar from '@/components/global/Navbar';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

function getYouFeedStorageKey(address: string) {
  return `poidh:lastSeenYouFeed:${address.toLowerCase()}`;
}

function getActivityKey(
  activity:
    | {
        tx: string;
        index?: number | null;
      }
    | undefined
) {
  if (!activity) {
    return null;
  }

  return `${activity.tx}:${activity.index ?? ''}`;
}

export default function Feed() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabFromUrl = searchParams.get('tab') === 'you' ? 'you' : 'all';

  const [display, setDisplay] = useState<'all' | 'you'>(tabFromUrl);

  const account = useAccount();

  useEffect(() => {
    setDisplay(tabFromUrl);
  }, [tabFromUrl]);

  const isYouFeed = display === 'you';

  const canLoadFeed = !isYouFeed || !!account.address;

  /*
   * Derive the address directly instead of storing it separately.
   *
   * This avoids:
   * - an unnecessary state update/effect
   * - accidentally fetching the global feed while "you" is selected
   *   but no wallet is connected
   */
  const address = isYouFeed ? account.address : undefined;

  const activities = trpc.accounts.activities.useInfiniteQuery(
    {
      address,
    },
    {
      enabled: canLoadFeed,

      getNextPageParam: (lastPage) => lastPage.nextCursor,

      staleTime: 30_000,

      refetchOnWindowFocus: false,
    }
  );

  const latestNotifiableActivity = trpc.accounts.activities.useQuery(
    {
      address: account.address,
      limit: 1,
      excludeOwnActivity: true,
    },
    {
      enabled: isYouFeed && !!account.address,
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    }
  );

  /*
   * Once the personalized feed is actually being viewed
   * and its newest item has loaded, mark that item as seen.
   *
   * This is wallet-specific so multiple wallets on the same
   * device keep independent notification states.
   */
  useEffect(() => {
    if (!isYouFeed || !account.address || typeof window === 'undefined') {
      return;
    }

    const newestActivity = latestNotifiableActivity.data?.items?.[0];

    const newestActivityKey = getActivityKey(newestActivity);

    if (!newestActivityKey) {
      return;
    }

    const storageKey = getYouFeedStorageKey(account.address);

    window.localStorage.setItem(storageKey, newestActivityKey);

    /*
     * localStorage's native "storage" event doesn't fire
     * in the same browser tab that made the change.
     *
     * Tell Navbar immediately so its red dot disappears
     * without requiring a reload.
     */
    window.dispatchEvent(new Event('poidh-you-feed-seen'));
  }, [isYouFeed, account.address, latestNotifiableActivity.data]);

  const handleDisplayChange = (nextDisplay: 'all' | 'you') => {
    setDisplay(nextDisplay);

    const params = new URLSearchParams(searchParams.toString());

    if (nextDisplay === 'you') {
      params.set('tab', 'you');
    } else {
      params.delete('tab');
    }

    const query = params.toString();

    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  };

  const handleLoadMore = async () => {
    if (!activities.hasNextPage || activities.isFetchingNextPage) {
      return;
    }

    await activities.fetchNextPage();
  };

  return (
    <div className='min-h-screen pb-20'>
      <div className='flex flex-col gap-2 pt-12 px-4 sm:px-10 border-b border-white pb-3 items-center justify-center'>
        <h1 className='text-center font-mono mb-6 text-4xl'>📸</h1>

        <div className='z-1 flex flex-wrap container mx-auto w-full items-center px-6 justify-center'>
          <div className='w-full md:w-auto flex justify-center'>
            <div
              id='feed-btn-container'
              className='relative flex items-center h-[64px] px-3 gap-4'
            >
              <button
                onClick={() => handleDisplayChange('all')}
                className='relative flex items-center justify-center px-2 h-full'
                aria-pressed={display === 'all'}
              >
                <div
                  className={cn(
                    'flex flex-col items-center justify-center w-20 h-14 rounded-md transition-transform',

                    display === 'all'
                      ? 'selected-icon bg-white/20 scale-105 shadow-lg ring-1 ring-white/10'
                      : 'bg-transparent hover:bg-white/5 hover:scale-105'
                  )}
                >
                  <EarthIcon size={20} />

                  <span className='font-mono text-xs text-white mt-1'>all</span>
                </div>

                {display === 'all' && (
                  <div className='absolute -bottom-2 left-1/2 -translate-x-1/2 h-1 w-12 bg-poidhRed rounded-full' />
                )}
              </button>

              <button
                onClick={() => handleDisplayChange('you')}
                className='relative flex items-center justify-center px-2 h-full focus:outline-none focus:ring-0 focus-visible:outline-none'
                aria-pressed={display === 'you'}
              >
                <div
                  className={cn(
                    'flex flex-col items-center justify-center w-20 h-14 rounded-md transition-transform',

                    display === 'you'
                      ? 'selected-icon bg-white/20 scale-105 shadow-lg ring-1 ring-white/10'
                      : 'bg-transparent hover:bg-white/5 hover:scale-105'
                  )}
                >
                  <YouIcon size={20} />

                  <span className='font-mono text-xs text-white mt-1'>you</span>
                </div>

                {display === 'you' && (
                  <div className='absolute -bottom-2 left-1/2 -translate-x-1/2 h-1 w-12 bg-poidhRed rounded-full' />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className='py-4 container mx-auto px-4 sm:px-6'>
        <div className='w-full max-w-5xl mx-auto backdrop-blur-md rounded-xl p-4 sm:p-6'>
          <div className='flex flex-col items-center'>
            {isYouFeed && !account.address ? (
              <div className='text-white/60 text-center py-8'>
                Please connect your wallet to see your activities
              </div>
            ) : activities.isLoading ? (
              <div className='text-white/60 py-8'>Loading...</div>
            ) : activities.isError ? (
              <div className='text-white/60 py-8'>
                Error loading activities.
              </div>
            ) : !activities.data?.pages?.length ||
              activities.data.pages[0]?.items?.length === 0 ? (
              <div className='text-white/60 py-8'>No recent activity</div>
            ) : (
              <div className='w-full'>
                <InfiniteScroll
                  loadMore={handleLoadMore}
                  hasMore={
                    !!activities.hasNextPage && !activities.isFetchingNextPage
                  }
                  loader={
                    <div
                      key='loader'
                      className='animate-pulse text-center py-4 text-white/60'
                    >
                      Loading more...
                    </div>
                  }
                  threshold={500}
                >
                  <div className='w-full flex flex-col items-center gap-4'>
                    {activities.data.pages
                      .flatMap((page) => page.items)
                      .map((tx) => (
                        <Activity
                          key={tx.tx + String(tx.index ?? '')}
                          activity={tx as any}
                        />
                      ))}
                  </div>
                </InfiniteScroll>
              </div>
            )}

            {activities.isFetchingNextPage && (
              <div className='animate-pulse text-center py-4 text-white/60'>
                Loading more...
              </div>
            )}
          </div>
        </div>
      </div>

      <Navbar type='bounty' />
    </div>
  );
}
