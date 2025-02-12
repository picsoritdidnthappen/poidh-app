'use-client';

import { useState } from 'react';

import { useGetChain } from '@/hooks/useGetChain';
import { trpc } from '@/trpc/client';
import { cn } from '@/utils';
import { FormControl, MenuItem, Select } from '@mui/material';
import InfiniteScroll from 'react-infinite-scroller';
import { SortIcon } from '@/components/global/Icons';
import BountyList from '../bounty/BountyList';

type DisplayType = 'open' | 'progress' | 'past';
type SortType = 'value' | 'id';

export default function ContentHome() {
  const [display, setDisplay] = useState<DisplayType>('open');
  const [sortType, setSortType] = useState<SortType>('value');
  const chain = useGetChain();

  const bounties = trpc.bounties.useInfiniteQuery(
    {
      chainId: chain.id,
      status: display,
      limit: 6,
      sortType,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  return (
    <div>
      <div className='z-1 flex flex-wrap container mx-auto border-b border-white hover:border-white py-6 md:py-12 sm:py-8 w-full items-center px-8'>
        <div className='hidden md:flex flex-1'></div>
        <div className='w-full md:w-auto flex justify-center'>
          <div
            id='btn-container'
            className={cn(
              'flex flex-nowrap border border-white rounded-full transition-all bg-gradient-to-r h-[42px]',
              'md:text-base sm:text-sm text-xs',
              display == 'open' && 'from-red-500 to-40%',
              display == 'progress' &&
                'via-red-500 from-transparent to-transparent from-[23.33%] to-[76.66%]',
              display == 'past' && 'from-transparent from-60% to-red-500',
              'gap-2 md:gap-4'
            )}
          >
            <button
              onClick={() => setDisplay('open')}
              className='flex-grow sm:flex-grow-0 md:px-5 px-3 h-full flex items-center justify-center'
            >
              new bounties
            </button>
            <button
              onClick={() => setDisplay('progress')}
              className='flex-grow sm:flex-grow-0 md:px-5 px-3 h-full flex items-center justify-center'
            >
              voting in progress
            </button>
            <button
              onClick={() => setDisplay('past')}
              className='flex-grow sm:flex-grow-0 md:px-5 px-3 h-full flex items-center justify-center'
            >
              past bounties
            </button>
          </div>
        </div>
        <div className='w-full md:w-auto flex justify-center md:justify-end mt-2 md:mt-0 md:flex-1 ml-3'>
          <FormControl className='h-[36px] md:h-[42px]'>
            <Select
              id='sort-select'
              value={sortType}
              className='h-full py-0 rounded-full'
              sx={{
                color: 'white',
                '& .MuiSvgIcon-root': { color: 'white' },
                '& fieldset': {
                  borderColor: 'white',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'white !important',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'white !important',
                },
              }}
              MenuProps={{
                sx: {
                  '& .MuiPaper-root': {
                    backdropFilter: 'blur(8px)',
                    background:
                      'linear-gradient(to top, rgba(209, 236, 255, 0.2) 10%, rgba(209, 236, 255, 0.1) 30%, rgba(209, 236, 255, 0.05) 50%)',
                    color: '#FFF',
                    marginTop: '0.25rem',
                  },
                  '& .MuiMenuItem-root': {
                    fontFamily: 'GeistMono-Regular',
                    fontSize: '0.875rem',
                  },
                },
              }}
              renderValue={() => <SortIcon width={18} height={18} />}
              onChange={(e) => setSortType(e.target.value as SortType)}
            >
              <MenuItem value='value' className='color-white'>
                by value
              </MenuItem>
              {/* id == date */}
              <MenuItem value='id' className='color-white'>
                by date
              </MenuItem>
            </Select>
          </FormControl>
        </div>
      </div>

      <div className='pb-20 z-1'>
        {bounties.data && (
          <InfiniteScroll
            loadMore={async () => await bounties.fetchNextPage()}
            hasMore={bounties.hasNextPage && !bounties.isFetchingNextPage}
            loader={
              <div key='loader' className='animate-pulse text-center'>
                Loading more...
              </div>
            }
            threshold={300}
          >
            <BountyList
              key={bounties.data.pages[0]?.items[0]?.id || 'empty-list'}
              bounties={bounties.data.pages.flatMap((page) =>
                page.items.map((bounty) => ({
                  id: bounty.id.toString(),
                  title: bounty.title,
                  description: bounty.description,
                  amount: bounty.amount,
                  isMultiplayer: bounty.is_multiplayer || false,
                  inProgress: bounty.in_progress || false,
                  hasClaims: bounty.claims.length > 0,
                  network: chain.slug,
                }))
              )}
            />
          </InfiniteScroll>
        )}
      </div>
    </div>
  );
}
