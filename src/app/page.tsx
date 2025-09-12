'use client';

import React, { useState } from 'react';
import { trpc } from '@/trpc/client';
import { cn } from '@/utils';
import BountyList from '@/components/bounty/BountyList';
import { BountyDisplayType, BountySortType, ChainId } from '@/utils/types';
import { getChainById } from '@/utils/config';
import PastBountyCard from '@/components/bounty/PastBountyCard';
import NavBarMobile from '@/components/global/NavBarMobile';
import CreateBounty from '@/components/bounty/CreateBounty';
import { useScreenSize } from '@/hooks/useScreenSize';
import { FormControl, MenuItem, Select } from '@mui/material';
import { SortIcon } from '@/components/global/Icons';

export default function Home() {
  const [display, setDisplay] = useState<BountyDisplayType>('open');
  const [sortType, setSortType] = useState<BountySortType>('value');
  const isMobile = useScreenSize();

  const bounties = trpc.allBounties.useQuery({
    status: display,
    sortType: sortType,
    limit: 50,
  });

  return (
    <>
      <div>
        <div className='container mx-auto text-center my-6 mt-8'>
          <h1 className='font-mono text-4xl'>poidh</h1>
          <h3 className='font-mono text-2xl mt-4 mb-8 tracking-wide'>
            you can just incentivize things
          </h3>
        </div>
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
                renderValue={() => <SortIcon size={18} />}
                onChange={(e) => setSortType(e.target.value as BountySortType)}
              >
                <MenuItem value='value' className='color-white'>
                  by value
                </MenuItem>
                <MenuItem value='id' className='color-white'>
                  by date
                </MenuItem>
              </Select>
            </FormControl>
          </div>
        </div>

        <div className='pb-20 z-1 mt-7'>
          {bounties.data && bounties.data.items.length > 0 ? (
            display !== 'past' ? (
              <BountyList
                key={(bounties.data.items[0]?.id ?? 'empty-list').toString()}
                bounties={bounties.data.items.map((bounty: any) => ({
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
                {bounties.data.items.map((bounty: any) => {
                  const claim = bounty.claims.find((c: any) => c.is_accepted);
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
                bounties {display === 'progress' ? 'in voting' : ''} found
              </div>
            </div>
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
