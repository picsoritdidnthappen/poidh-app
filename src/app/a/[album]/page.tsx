'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { trpc } from '@/trpc/client';
import BountyList from '@/components/bounty/BountyList';
import { BountyDisplayType, ChainId } from '@/utils/types';
import { getChainById } from '@/utils/config';
import PastBountyCard from '@/components/bounty/PastBountyCard';
import Navbar from '@/components/global/Navbar';

export default function Album({ params }: { params: { album: string } }) {
  const album = params.album ?? 'album';
  const [display, setDisplay] = useState<BountyDisplayType>('past');
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const bounties = trpc.bounties.fetchByAlbum.useQuery({
    album: album.toLowerCase(),
    status: display,
  });

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

    window.addEventListener('resize', updateSliderPosition);
    return () => window.removeEventListener('resize', updateSliderPosition);
  }, [display, updateSliderPosition]);

  return (
    <>
      <div>
        <div className='container mx-auto text-center my-6 mt-8'>
          <h1 className='font-mono text-4xl'>{album}</h1>
        </div>
        <div className='z-1 flex flex-wrap container mx-auto border-b border-white hover:border-white py-6 md:pb-12 sm:pb-8 pt-4  w-full items-center justify-center px-8'>
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
            <button
              ref={(el) => {
                tabRefs.current[0] = el;
              }}
              onClick={() => setDisplay('open')}
              className='relative z-10 flex-grow sm:flex-grow-0 md:px-5 px-3 h-full flex items-center justify-center'
            >
              new bounties
            </button>
            <button
              ref={(el) => {
                tabRefs.current[1] = el;
              }}
              onClick={() => setDisplay('progress')}
              className='relative z-10 flex-grow sm:flex-grow-0 md:px-5 px-3 h-full flex items-center justify-center'
            >
              voting in progress
            </button>
            <button
              ref={(el) => {
                tabRefs.current[2] = el;
              }}
              onClick={() => setDisplay('past')}
              className='relative z-10 flex-grow sm:flex-grow-0 md:px-5 px-3 h-full flex items-center justify-center'
            >
              past bounties
            </button>
          </div>
        </div>

        <div className='pb-20 z-1 mt-7'>
          {bounties.data && bounties.data.length > 0 ? (
            display !== 'past' ? (
              <BountyList
                key={(bounties.data[0]?.id ?? 'empty-list').toString()}
                bounties={bounties.data.map((bounty) => ({
                  id: bounty.id.toString(),
                  chainId: bounty.chain_id as ChainId,
                  network: getChainById({ chainId: bounty.chain_id as ChainId })
                    .name,
                  title: bounty.title,
                  description: bounty.description,
                  amount: bounty.amount,
                  isMultiplayer: bounty.is_multiplayer || false,
                  inProgress: bounty.in_progress || false,
                  isCanceled: bounty.is_canceled || false,
                  hasClaims: bounty.claims.length > 0,
                }))}
                showChainIcon={true}
              />
            ) : (
              <div className='container mx-auto p-4 flex flex-col gap-12 lg:grid lg:grid-cols-12 lg:gap-12 lg:px-0'>
                {bounties.data.map((bounty) => {
                  const claim = bounty.claims.find((c) => c.is_accepted);
                  if (!claim) return null;
                  return (
                    <PastBountyCard
                      key={`${claim.id}-${claim.chain_id}`}
                      claim={{
                        id: claim.id.toString(),
                        title: claim.title,
                        description: claim.description,
                        url: claim.url ?? '',
                        issuer: claim.issuer,
                        bountyId: claim.bounty_id.toString(),
                        chainId: claim.chain_id as ChainId,
                        accepted: true,
                      }}
                      bountyTitle={bounty.title}
                      bountyAmount={bounty.amount}
                      isMultiplayer={bounty.is_multiplayer || false}
                    />
                  );
                })}
              </div>
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
    </>
  );
}
