/* eslint-disable simple-import-sort/imports */
'use-client';

import { useState } from 'react';

import { cn } from '@/lib';
import { useGetChain } from '@/hooks/new/useGetChain';
import BountyList from '@/components/new/ui/BountyList';
import { trpc } from '@/trpc/client';

type DisplayType = 'open' | 'progress' | 'past';

export default function ContentHome() {
  const [display, setDisplay] = useState<DisplayType>('open');
  const chain = useGetChain();

  const bounties = trpc.bounties.useInfiniteQuery(
    {
      chainId: chain.id,
      status: display,
      limit: 5,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor?.toString(),
    }
  );

  return (
    <>
      <div className='z-1 flex flex-nowrap container mx-auto border-b border-white py-12 w-full justify-center gap-2  px-8'>
        <div
          className={cn(
            'flex flex-nowrap border border-white rounded-full transition-all bg-gradient-to-r',
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
            className='flex-grow sm:flex-grow-0 md:px-5 px-3 py-2'
          >
            new bounties
          </button>
          <button
            onClick={() => setDisplay('progress')}
            className='flex-grow sm:flex-grow-0 md:px-5 px-3 py-2'
          >
            voting in progress
          </button>
          <button
            onClick={() => setDisplay('past')}
            className='flex-grow sm:flex-grow-0 md:px-5 px-3 py-2'
          >
            past bounties
          </button>
        </div>
      </div>

      <div className='pb-20 z-1'>
        {bounties.data && (
          <BountyList
            bounties={bounties.data.pages.flatMap((page) =>
              page.items.map((bounty) => ({
                id: bounty.primaryId.toString(),
                title: bounty.title,
                description: bounty.description,
                amount: bounty.amount,
                isMultiplayer: Boolean(bounty.isMultiplayer),
                inProgress: Boolean(bounty.inProgress),
                hasClaims: bounty.claims.length > 0,
                network: chain.chainPathName,
              }))
            )}
          />
        )}
      </div>
      {bounties.hasNextPage && (
        <div className='flex justify-center items-center pb-96'>
          <button
            className='border border-white rounded-full px-5  backdrop-blur-sm bg-[#D1ECFF]/20  py-2'
            onClick={() => bounties.fetchNextPage()}
            disabled={bounties.isFetchingNextPage}
          >
            {bounties.isFetchingNextPage ? 'loading...' : 'show more'}
          </button>
        </div>
      )}
    </>
  );
}
