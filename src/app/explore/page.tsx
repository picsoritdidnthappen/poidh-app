'use client';

import AlbumList from '@/components/albums/AlbumList';
import { MagnifyingGlassIcon } from '@/components/global/Icons';
import { cn } from '@/utils';
import { trpc } from '@/trpc/client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import InfiniteScroll from 'react-infinite-scroller';
import BountyList from '@/components/bounty/BountyList';

type Display = 'bounties' | 'albums';

export default function Explore() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialDisplay = (
    searchParams.get('tab') === 'bounties' ? 'bounties' : 'albums'
  ) as Display;
  const initialSearch = searchParams.get('search') || '';
  const [search, setSearch] = useState<string>(initialSearch);
  const [display, setDisplay] = useState<Display>(initialDisplay);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', display);
    if (search) {
      params.set('search', search);
    } else {
      params.delete('search');
    }
    const url = `?${params.toString()}`;
    router.replace(url, { scroll: false });
  }, [display, search]);

  const bounties = trpc.bounties.fetchByKeyword.useInfiniteQuery(
    {
      keyword: search,
      limit: 15,
    },
    {
      enabled: display === 'bounties',
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  return (
    <div>
      <div className='flex flex-col gap-2 pt-12 px-4 sm:px-10 border-b border-white pb-8 items-center justify-center'>
        <h2 className='text-center font-mono mb-10'>
          explore {display} on poidh 🔎
        </h2>
        <div className='relative w-full md:w-[50%] mb-5'>
          <input
            type='text'
            value={search}
            onChange={(e) => setSearch(e.target.value.toLowerCase())}
            className='w-full h-11 pl-5 pr-12 rounded-full bg-transparent border border-white placeholder:text-slate-200 shadow-sm'
            placeholder='search by keyword'
            maxLength={120}
          />
          <div className='absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-2'>
            <button
              type='button'
              className='h-8 w-8 bg-poidhRed rounded-full flex items-center justify-center border border-[#E6EEF3] shadow-sm'
              aria-label='search'
            >
              <MagnifyingGlassIcon size={16} />
            </button>
          </div>
        </div>
        <div className='z-1 flex flex-wrap container mx-auto hover:border-white w-full items-center px-8 justify-center'>
          <div className='w-full md:w-auto flex justify-center'>
            <div
              id='btn-container'
              className={cn(
                'flex flex-nowrap border border-white rounded-full transition-all bg-gradient-to-r h-[42px]',
                'md:text-base text-xs',
                display == 'albums' && 'from-red-500 to-60%',
                display == 'bounties' && 'from-transparent from-40% to-red-500'
              )}
            >
              <button
                onClick={() => setDisplay('albums')}
                className='flex-grow sm:flex-grow-0 md:px-5 px-3 h-full flex items-center justify-center'
              >
                albums
              </button>
              <button
                onClick={() => setDisplay('bounties')}
                className='flex-grow sm:flex-grow-0 md:px-5 px-3 h-full flex items-center justify-center'
              >
                bounties
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className='py-10'>
        {display === 'albums' && (
          <div className='lg:px-20 px-8'>
            <AlbumList keyword={search} />
          </div>
        )}
        {display === 'bounties' && bounties?.data ? (
          <InfiniteScroll
            loadMore={async () => await bounties.fetchNextPage()}
            hasMore={bounties.hasNextPage && !bounties.isFetchingNextPage}
            loader={
              <div key='loader' className='animate-pulse text-center'>
                Loading...
              </div>
            }
            threshold={300}
          >
            <BountyList
              key={bounties.data.pages[0]?.items[0]?.id || 'empty-list'}
              bounties={bounties.data.pages.flatMap((page) =>
                page.items.map((bounty) => ({
                  id: bounty.id.toString(),
                  chainId: bounty.chainId,
                  title: bounty.title,
                  description: bounty.description,
                  amount: bounty.amount,
                  isMultiplayer: bounty.isMultiplayer || false,
                  inProgress: bounty.inProgress || false,
                  isCanceled: bounty.isCanceled || false,
                  hasClaims: bounty.claims.length > 0,
                }))
              )}
              showChainIcon={true}
            />
          </InfiniteScroll>
        ) : display === 'bounties' &&
          (bounties.isLoading || bounties.isFetching) ? (
          <div className='text-center py-20 text-white/60 animate-pulse'>
            loading…
          </div>
        ) : null}
      </div>
    </div>
  );
}
