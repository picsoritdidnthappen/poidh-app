'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/utils';
import { EarthIcon, YouIcon } from '@/components/global/Icons';
import Activity from '@/components/feed/Activity';
import { trpc } from '@/trpc/client';
import { useAccount } from 'wagmi';
import InfiniteScroll from 'react-infinite-scroller';
import Navbar from '@/components/global/Navbar';

export default function Feed() {
  const [display, setDisplay] = useState<'all' | 'you'>('all');
  const [address, setAddress] = useState<string | undefined>(undefined);
  const account = useAccount();

  const activities = trpc.accounts.activities.useInfiniteQuery(
    {
      address,
    },
    {
      getNextPageParam: (lastPage) => {
        return lastPage.nextCursor;
      },
    }
  );

  useEffect(() => {
    if (display === 'all') {
      setAddress(undefined);
    }
    if (display === 'you') {
      setAddress(account.address);
    }
  }, [account, display]);

  return (
    <div className='min-h-screen '>
      <div className='flex flex-col gap-2 pt-12 px-4 sm:px-10 border-b border-white pb-3 items-center justify-center'>
        <h1 className='text-center font-mono mb-6 text-4xl'>📸</h1>

        <div className='z-1 flex flex-wrap container mx-auto w-full items-center px-6 justify-center'>
          <div className='w-full md:w-auto flex justify-center'>
            <div
              id='feed-btn-container'
              className='relative flex items-center h-[64px] px-3 gap-4'
            >
              <button
                onClick={() => setDisplay('all')}
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
                onClick={() => setDisplay('you')}
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
            {display === 'you' && !account.address ? (
              <div className='text-white/60 text-center py-8'>
                Please connect your wallet to see your activities
              </div>
            ) : !activities.isLoading &&
              (!activities.data?.pages?.length ||
                activities.data.pages[0]?.items?.length === 0) ? (
              <div className='text-white/60'>No recent activity</div>
            ) : activities.data && activities.data.pages.length > 0 ? (
              <div className='w-full'>
                <InfiniteScroll
                  loadMore={async () => await activities.fetchNextPage()}
                  hasMore={activities.hasNextPage ?? false}
                  loader={
                    <div
                      key='loader'
                      className='animate-pulse text-center py-4 text-white/60'
                    >
                      Loading more activities...
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
            ) : activities.isLoading ? (
              <div className='text-white/60'>Loading...</div>
            ) : (
              <div className='text-white/60'>Error loading activities.</div>
            )}
          </div>
        </div>
      </div>
      <Navbar type='bounty' />
    </div>
  );
}
