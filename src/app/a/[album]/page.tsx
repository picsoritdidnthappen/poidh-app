'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { trpc } from '@/trpc/client';
import BountyList from '@/components/bounty/BountyList';
import { BountyDisplayType, ChainId } from '@/utils/types';
import PastBountyCard from '@/components/bounty/PastBountyCard';
import Navbar from '@/components/global/Navbar';
import InfiniteScroll from 'react-infinite-scroller';

export default function Album({ params }: { params: { album: string } }) {
  const album = params.album ?? 'album';
  const [display, setDisplay] = useState<BountyDisplayType>('open');
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const bounties = trpc.bounties.fetchByAlbum.useInfiniteQuery(
    {
      album: album.toLowerCase(),
      status: display,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  const albumCounts = trpc.bounties.fetchAlbumCounts.useQuery({
    album: album.toLowerCase(),
  });

  const counts = {
    open: albumCounts.data?.open ?? 0,
    progress: albumCounts.data?.progress ?? 0,
    past: albumCounts.data?.past ?? 0,
  };

  const allItems = bounties.data?.pages.flatMap((page) => page.items) ?? [];

  const updateSliderPosition = useCallback(() => {
    const activeIndex = ['open', 'progress', 'past'].indexOf(display);
    const activeTab = tabRefs.current[activeIndex];

    if (activeTab) {
      const container = activeTab.parentElement;
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const tabRect = activeTab.getBoundingClientRect();
        const left = tabRect.left - containerRect.left;
        const width = tabRect.width;
        setSliderStyle({ left, width });
      }
    }
  }, [display]);

  useEffect(() => {
    updateSliderPosition();

    document.fonts.ready.then(() => {
      updateSliderPosition();
    });

    window.addEventListener('resize', updateSliderPosition);
    return () => window.removeEventListener('resize', updateSliderPosition);
  }, [display, updateSliderPosition]);

  return (
    <div className='pb-14'>
      <div>
        <div className='container mx-auto text-center my-6 mt-8 '>
          <h1 className='font-mono text-4xl'>{album}</h1>
        </div>
        <div className='z-1 flex flex-wrap container mx-auto border-b border-white hover:border-white py-6 md:pb-12 sm:pb-8 pt-4  w-full items-center justify-center px-8'>
          <div
            id='btn-container'
            className='relative flex flex-nowrap border border-white rounded-full h-[58px] md:h-[42px] gap-2 md:gap-4 md:text-base sm:text-sm text-xs bg-transparent overflow-hidden'
          >
            <div
              className='absolute top-0 h-full bg-poidhRed rounded-full transition-all duration-300 ease-in-out'
              style={{
                left: `${sliderStyle.left}px`,
                width: `${sliderStyle.width}px`,
              }}
            />
            <button
              ref={(el) => {
                tabRefs.current[0] = el;
              }}
              onClick={() => setDisplay('open')}
              className='relative z-10 flex-grow sm:flex-grow-0 md:px-5 px-3 h-full flex items-center justify-center text-center'
            >
              new bounties <span className='block md:inline'>({counts.open})</span>
            </button>
            <button
              ref={(el) => {
                tabRefs.current[1] = el;
              }}
              onClick={() => setDisplay('progress')}
              className='relative z-10 flex-grow sm:flex-grow-0 md:px-5 px-3 h-full flex items-center justify-center text-center'
            >
              voting in progress <span className='block md:inline'>({counts.progress})</span>
            </button>
            <button
              ref={(el) => {
                tabRefs.current[2] = el;
              }}
              onClick={() => setDisplay('past')}
              className='relative z-10 flex-grow sm:flex-grow-0 md:px-5 px-3 h-full flex items-center justify-center text-center'
            >
              past bounties <span className='block md:inline'>({counts.past})</span>
            </button>
          </div>
        </div>

        <div className='pb-20 z-1 mt-7'>
          {allItems.length > 0 ? (
            display !== 'past' ? (
              <InfiniteScroll
                loadMore={() => bounties.fetchNextPage()}
                hasMore={bounties.hasNextPage ?? false}
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
                <BountyList
                  bounties={allItems.map((bounty) => ({
                    ...bounty,
                    chainId: bounty.chainId as ChainId,
                  }))}
                  showChainIcon={true}
                />
              </InfiniteScroll>
            ) : (
              <InfiniteScroll
                loadMore={() => bounties.fetchNextPage()}
                hasMore={bounties.hasNextPage ?? false}
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
                <div className='container mx-auto p-4 flex flex-col gap-12 lg:grid lg:grid-cols-12 lg:gap-12 lg:px-0'>
                  {allItems
                    .filter(
                      (bounty) => !bounty.inProgress && !bounty.isCanceled
                    )
                    .map((bounty) => {
                      return (
                        <PastBountyCard
                          key={`bounty-list-album-past-${bounty.id}`}
                          bounty={{
                            ...bounty,
                            chainId: bounty.chainId as ChainId,
                          }}
                        />
                      );
                    })}
                </div>
              </InfiniteScroll>
            )
          ) : (
            <div className='container mx-auto p-4 flex items-center justify-center mt-24'>
              <div className='text-white/60 text-center'>
                No{' '}
                {display === 'open'
                  ? 'active'
                  : display === 'past'
                  ? 'past'
                  : ''}{' '}
                bounties {display === 'progress' ? 'in voting' : ''} found in
                this album
              </div>
            </div>
          )}
        </div>
      </div>
      <Navbar type='bounty' />
    </div>
  );
}
