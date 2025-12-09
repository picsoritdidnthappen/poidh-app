'use client';

import NavBarMobile from '@/components/global/NavBarMobile';
import CreateBounty from '@/components/bounty/CreateBounty';
import { useScreenSize } from '@/hooks/useScreenSize';
import { trpc } from '@/trpc/client';
import 'react-toastify/dist/ReactToastify.css';
import { BountyDisplayType, BountySortType, ChainId } from '@/utils/types';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useChainInfo } from '@/hooks/useGetChain';
import { FormControl, MenuItem, Select } from '@mui/material';
import InfiniteScroll from 'react-infinite-scroller';
import { SortIcon } from '@/components/global/Icons';
import BountyList from '@/components/bounty/BountyList';
import PastBountyCard from '@/components/bounty/PastBountyCard';
import Link from 'next/link';
import { ALBUMS } from '@/utils/constants';
import { useRouter, useSearchParams } from 'next/navigation';

export default function Home() {
  const isMobile = useScreenSize();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [display, setDisplay] = useState<BountyDisplayType>('open');
  const [sortType, setSortType] = useState<BountySortType>('value');
  const chain = useChainInfo();
  const [currentAlbumIndex, setCurrentAlbumIndex] = useState(0);
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as BountyDisplayType | null;
    const sortParam = searchParams.get('sort') as BountySortType | null;

    if (tabParam && ['open', 'progress', 'past'].includes(tabParam)) {
      setDisplay(tabParam);
    }
    if (sortParam && ['value', 'date'].includes(sortParam)) {
      setSortType(sortParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAlbumIndex((prevIndex) => (prevIndex + 1) % ALBUMS.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Update slider position when display changes or on resize
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

    // Update on window resize
    window.addEventListener('resize', updateSliderPosition);
    return () => window.removeEventListener('resize', updateSliderPosition);
  }, [display, updateSliderPosition]);

  const bounties = trpc.bounties.fetchAll.useInfiniteQuery(
    {
      status: display,
      limit: 6,
      sortType,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  return (
    <>
      <div className='flex flex-col items-center text-center px-6 pt-6 pb-2 lg:pt-14'>
        <h3 className='font-mono text-2xl mt-4 racking-wide'>
          <span className='flex flex-wrap md:flex-nowrap items-baseline justify-center gap-x-2.5'>
            <span>social bounties for</span>
            <Link
              href={`/a/${ALBUMS[currentAlbumIndex].slug}`}
              className='inline-block no-underline overflow-hidden h-[1.2em] relative w-full md:w-auto text-center md:text-left'
              style={{
                textDecoration: 'none',
                cursor: 'pointer',
              }}
            >
              <span
                key={currentAlbumIndex}
                className='block'
                style={{
                  animation: 'turnstile 0.6s ease-in-out',
                }}
              >
                {ALBUMS[currentAlbumIndex].name}
              </span>
            </Link>
          </span>
        </h3>
      </div>
      <div>
        <div className='z-1 flex flex-wrap container mx-auto border-b border-white hover:border-white py-6 md:py-8 sm:py-4 w-full items-center px-8'>
          <div className='hidden md:flex flex-1'></div>
          <div className='w-full md:w-auto flex justify-center'>
            <div
              id='btn-container'
              className='relative flex flex-nowrap border border-white rounded-full h-[42px] gap-2 md:gap-4 md:text-base sm:text-sm text-xs bg-transparent overflow-hidden'
            >
              {/* Slider indicator */}
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
                onClick={() => {
                  setDisplay('open');
                  router.push(`/?tab=open&sort=${sortType}`);
                }}
                className='relative z-10 flex-grow sm:flex-grow-0 md:px-5 px-3 h-full flex items-center justify-center'
              >
                new bounties
              </button>
              <button
                ref={(el) => {
                  tabRefs.current[1] = el;
                }}
                onClick={() => {
                  setDisplay('progress');
                  router.push(`/?tab=progress&sort=${sortType}`);
                }}
                className='relative z-10 flex-grow sm:flex-grow-0 md:px-5 px-3 h-full flex items-center justify-center'
              >
                voting in progress
              </button>
              <button
                ref={(el) => {
                  tabRefs.current[2] = el;
                }}
                onClick={() => {
                  setDisplay('past');
                  router.push(`/?tab=past&sort=${sortType}`);
                }}
                className='relative z-10 flex-grow sm:flex-grow-0 md:px-5 px-3 h-full flex items-center justify-center'
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
                renderValue={() => <SortIcon size={18} />}
                onChange={(e) => {
                  const newSort = e.target.value as BountySortType;
                  setSortType(newSort);
                  router.push(`/?tab=${display}&sort=${newSort}`);
                }}
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
              {display !== 'past' ? (
                <BountyList
                  key={bounties.data.pages[0]?.items[0]?.id || 'empty-list'}
                  showChainIcon={true}
                  bounties={bounties.data.pages.flatMap((page) =>
                    page.items.map((bounty) => ({
                      id: bounty.id.toString(),
                      chainId: bounty.chain_id as ChainId,
                      title: bounty.title,
                      description: bounty.description,
                      amount: bounty.amount,
                      isMultiplayer: bounty.is_multiplayer || false,
                      inProgress: bounty.in_progress || false,
                      isCanceled: bounty.is_canceled || false,
                      hasClaims: bounty.claims.length > 0,
                      network: chain.slug,
                    }))
                  )}
                />
              ) : (
                <div className='container mx-auto p-4 flex flex-col gap-12 lg:grid lg:grid-cols-12 lg:gap-12 lg:px-0'>
                  {bounties.data.pages.flatMap((page) =>
                    page.items
                      .filter((bounty) => bounty.claims.length > 0)
                      .map((bounty) => {
                        const claim = bounty.claims.filter(
                          (claim) => claim.is_accepted
                        )[0];
                        return claim ? (
                          <PastBountyCard
                            key={`${claim.id}-${claim.chain_id}`}
                            claim={{
                              id: claim.id.toString(),
                              title: claim.title,
                              description: claim.description,
                              url: claim.url,
                              issuer: claim.issuer,
                              bountyId: claim.bounty_id.toString(),
                              chainId: claim.chain_id as ChainId,
                              accepted: true,
                            }}
                            bountyTitle={bounty.title}
                            bountyAmount={bounty.amount}
                            isMultiplayer={bounty.is_multiplayer || false}
                          />
                        ) : null;
                      })
                  )}
                </div>
              )}
            </InfiniteScroll>
          )}
        </div>
      </div>
      {isMobile ? (
        <NavBarMobile type='bounty' showChainSelector={true} />
      ) : (
        <CreateBounty showChainSelector={true} />
      )}
    </>
  );
}
