'use client';

import { useState } from 'react';

import { useGetChain } from '@/hooks/useGetChain';
import NftList from '@/components/bounty/NftList';
import { trpc } from '@/trpc/client';
import { cn } from '@/utils';
import BountyList from '../bounty/BountyList';
import ClaimsListAccount from './ClaimListAccount';

type Section = 'nfts' | 'bounties' | 'claims';

export default function AccountInfo({ address }: { address: string }) {
  const chain = useGetChain();

  const [currentSection, setCurrentSection] = useState<Section>('nfts');

  const accountActivities = trpc.accountActivities.useQuery(
    { address, chainId: chain.id },
    { enabled: !!address }
  );

  const accountStats = trpc.accountInfo.useQuery(
    { address, chainId: chain.id },
    { enabled: !!address }
  );

  return (
    <>
      {address && (
        <div>
          <div className='flex flex-col lg:flex-row lg:justify-between lg:items-start p-8'>
            <div>
              <div className='flex flex-col border-b border-dashed pb-4'>
                <span>user</span>
                <div className='flex flex-row items-center gap-2'>
                  <span className='text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl'>
                    {formatAddress(address)}
                  </span>
                </div>
              </div>
              <div className='flex flex-col'>
                <div>{`completed bounties: ${
                  accountActivities.data?.NFTs.length ?? 0
                }`}</div>
                <div>
                  {`total paid: ${
                    accountStats.data?.totalPaid.amountCrypto ?? 0
                  } ${chain.currency}`}
                </div>
                <div>
                  in progress bounties:{' '}
                  {accountActivities.data?.bounties.length ?? 0}
                </div>
                <div>
                  {`total in contract: ${
                    accountStats.data?.amountInContract.amountCrypto ?? 0
                  } ${chain.currency}`}
                </div>
                <div>
                  {`completed claims: ${
                    accountStats.data?.acceptedClaimsCount ?? 0
                  }
                    `}
                </div>
                <div>
                  {`total earned: ${
                    accountStats.data?.totalEarn.amountCrypto ?? 0
                  } ${chain.currency}`}
                </div>
              </div>
            </div>
            <div className='flex flex-col '>
              <span>poidh score:</span>
              <span className='text-4xl text-poihRed border-y border-dashed'>
                {accountStats.data?.poidhScore}
              </span>
            </div>
          </div>

          <div className='flex flex-row overflow-x-scroll items-center py-6 border-b border-white justify-center gap-x-5 w-full px-3'>
            <div
              id='btn-container'
              className={cn(
                'flex flex-nowrap border border-white rounded-full transition-all bg-gradient-to-r h-[42px] gap-2 md:gap-4 md:text-base sm:text-sm text-xs',
                currentSection == 'nfts' && 'from-red-500 to-40%',
                currentSection == 'bounties' &&
                  'via-red-500 from-transparent to-transparent from-[23.33%] to-[76.66%]',
                currentSection == 'claims' &&
                  'from-transparent from-60% to-red-500'
              )}
            >
              <button
                onClick={() => setCurrentSection('nfts')}
                className='flex-grow sm:flex-grow-0 md:px-5 px-3 h-full flex items-center justify-center'
              >
                NFTs({accountActivities.data?.NFTs.length ?? 0})
              </button>
              <button
                onClick={() => setCurrentSection('bounties')}
                className='flex-grow sm:flex-grow-0 md:px-5 px-3 h-full flex items-center justify-center'
              >
                bounties ({accountActivities.data?.bounties.length ?? 0})
              </button>
              <button
                onClick={() => setCurrentSection('claims')}
                className='flex-grow sm:flex-grow-0 md:px-5 px-3 h-full flex items-center justify-center'
              >
                claims ({accountActivities.data?.claims.length ?? 0})
              </button>
            </div>
          </div>

          <div>
            {currentSection === 'nfts' && (
              <div className='lg:px-20 px-8'>
                <NftList NFTs={accountActivities.data?.NFTs ?? []} />
              </div>
            )}
            {currentSection === 'bounties' && (
              <BountyList bounties={accountActivities.data?.bounties ?? []} />
            )}
            {currentSection === 'claims' && (
              <div className='lg:px-20 px-8'>
                <ClaimsListAccount
                  claims={accountActivities.data?.claims ?? []}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export function formatAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
