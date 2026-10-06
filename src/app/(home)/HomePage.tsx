'use client';

import Navbar from '@/components/global/Navbar';
import { trpc } from '@/trpc/client';
import 'react-toastify/dist/ReactToastify.css';
import { BountyDisplayType, BountySortType, ChainId } from '@/utils/types';
import { useState, useEffect, useRef, useCallback } from 'react';
import { FormControl, MenuItem, Select } from '@mui/material';
import InfiniteScroll from 'react-infinite-scroller';
import { SortIcon } from '@/components/global/Icons';
import BountyList, { BountyListSkeleton } from '@/components/bounty/BountyList';
import PastBountyCard, {
  PAST_BOUNTY_GRID_CLASS,
  PastBountyGridSkeleton,
} from '@/components/bounty/PastBountyCard';
import { useRouter, useSearchParams } from 'next/navigation';
import { useChainInfo } from '@/hooks/useChainInfo';
import {
  getDisplayFromParam,
  getSortFromParam,
  HOME_PAGE_SIZE,
} from './homeParams';

const TABS: { display: BountyDisplayType; label: string }[] = [
  { display: 'open', label: 'new bounties' },
  { display: 'progress', label: 'voting in progress' },
  { display: 'past', label: 'past bounties' },
];

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Kept in state as well as the URL so the tab switches on click, without
  // waiting for the navigation
  const [display, setDisplay] = useState(() =>
    getDisplayFromParam(searchParams.get('tab'))
  );
  const [sortType, setSortType] = useState(() =>
    getSortFromParam(searchParams.get('sort'))
  );
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const chain = useChainInfo();

  // Follow the URL on back and forward
  useEffect(() => {
    setDisplay(getDisplayFromParam(searchParams.get('tab')));
    setSortType(getSortFromParam(searchParams.get('sort')));
  }, [searchParams]);

  const select = (newDisplay: BountyDisplayType, newSort: BountySortType) => {
    setDisplay(newDisplay);
    setSortType(newSort);
    // scroll: false keeps the page where it is. Otherwise Next jumps back to
    // the top when the switcher is scrolled to the top of the screen
    router.push(`/?tab=${newDisplay}&sort=${newSort}`, { scroll: false });
  };

  const updateSliderPosition = useCallback(() => {
    const activeIndex = TABS.findIndex((tab) => tab.display === display);
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

  const bounties = trpc.bounties.fetchAll.useInfiniteQuery(
    {
      status: display,
      limit: HOME_PAGE_SIZE,
      sortType,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  return (
    <>
      <div>
        <div className='z-1 flex flex-wrap container mx-auto border-b border-white hover:border-white py-6 md:py-8 sm:py-4 w-full items-center px-8'>
          <div className='hidden md:flex flex-1'></div>
          <div className='w-full md:w-auto flex justify-center'>
            <div
              id='btn-container'
              className='relative flex flex-nowrap border border-white rounded-full h-[42px] gap-2 md:gap-4 md:text-base sm:text-sm text-xs bg-transparent overflow-hidden'
            >
              <div
                className='absolute top-0 h-full bg-poidhRed rounded-full transition-all duration-300 ease-in-out'
                style={{
                  left: `${sliderStyle.left}px`,
                  width: `${sliderStyle.width}px`,
                }}
              />
              {TABS.map((tab, i) => (
                <button
                  key={tab.display}
                  aria-pressed={display === tab.display}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  onClick={() => select(tab.display, sortType)}
                  className='relative z-10 flex-grow sm:flex-grow-0 md:px-5 px-3 h-full flex items-center justify-center'
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className='w-full md:w-auto flex justify-center md:justify-end mt-2 md:mt-0 md:flex-1 md:ml-3'>
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
                renderValue={() => <SortIcon size={18} />}
                onChange={(e) =>
                  select(display, e.target.value as BountySortType)
                }
              >
                <MenuItem value='value' className='color-white'>
                  by value
                </MenuItem>
                <MenuItem value='date' className='color-white'>
                  by date
                </MenuItem>
              </Select>
            </FormControl>
          </div>
        </div>

        <div className='pb-20 z-1 mt-4'>
          {bounties.data ? (
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
              {display !== 'past' ? (
                <BountyList
                  key={bounties.data.pages[0]?.items[0]?.id || 'empty-list'}
                  showChainIcon={true}
                  bounties={bounties.data.pages.flatMap((page) =>
                    page.items.map((bounty) => ({
                      ...bounty,
                      chainId: bounty.chainId as ChainId,
                    }))
                  )}
                />
              ) : (
                <div className={PAST_BOUNTY_GRID_CLASS}>
                  {bounties.data.pages.flatMap((page) =>
                    page.items.map(({ acceptedClaim, ...bounty }) =>
                      acceptedClaim &&
                      !bounty.isCanceled &&
                      !bounty.inProgress ? (
                        <PastBountyCard
                          key={`${bounty.chainId}-${bounty.id}`}
                          bounty={{
                            ...bounty,
                            chainId: bounty.chainId as ChainId,
                          }}
                          claim={{
                            ...acceptedClaim,
                            chainId: acceptedClaim.chainId as ChainId,
                          }}
                        />
                      ) : null
                    )
                  )}
                </div>
              )}
            </InfiniteScroll>
          ) : display === 'past' ? (
            // Holds the first page's space while a tab loads, so the page
            // doesn't collapse and jump
            <PastBountyGridSkeleton count={HOME_PAGE_SIZE} />
          ) : (
            <BountyListSkeleton count={HOME_PAGE_SIZE} />
          )}
        </div>
      </div>
      <Navbar type='bounty' />
    </>
  );
}
