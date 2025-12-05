'use client';

import NavBarMobile from '@/components/global/NavBarMobile';
import CreateBounty from '@/components/bounty/CreateBounty';
import { useScreenSize } from '@/hooks/useScreenSize';
import { trpc } from '@/trpc/client';
import 'react-toastify/dist/ReactToastify.css';
import { BountyDisplayType, BountySortType, ChainId } from '@/utils/types';
import { useState, useEffect } from 'react';
import { cn } from '@/utils';
import { useChainInfo } from '@/hooks/useGetChain';
import { FormControl, MenuItem, Select } from '@mui/material';
import InfiniteScroll from 'react-infinite-scroller';
import { SortIcon } from '@/components/global/Icons';
import BountyList from '@/components/bounty/BountyList';
import PastBountyCard from '@/components/bounty/PastBountyCard';
import Link from 'next/link';
import { ALBUMS } from '@/utils/constants';

export default function Home() {
  const isMobile = useScreenSize();
  const [display, setDisplay] = useState<BountyDisplayType>('open');
  const [sortType, setSortType] = useState<BountySortType>('value');
  const chain = useChainInfo();
  const [currentAlbumIndex, setCurrentAlbumIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAlbumIndex((prevIndex) => (prevIndex + 1) % ALBUMS.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

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
                renderValue={() => <SortIcon size={18} />}
                onChange={(e) => setSortType(e.target.value as BountySortType)}
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
