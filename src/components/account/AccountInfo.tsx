'use client';

import { useState } from 'react';
import { useGetChain } from '@/hooks/useGetChain';
import NftList from '@/components/bounty/NftList';
import { trpc } from '@/trpc/client';
import { cn } from '@/utils';
import BountyList from '../bounty/BountyList';
import ClaimsListAccount from './ClaimListAccount';
import CopyAddressButton from '@/components/global/CopyAddressButton';
import DisplayAddress from '@/components/global/DisplayAddress';
import FarcasterLink from '@/components/global/FarcasterIcon';
import XLink from '@/components/global/TwitterXLink';

type Section = 'nfts' | 'bounties' | 'claims';

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className='bg-white/5 rounded-md p-2.5 backdrop-blur-sm'>
      <div className='text-xs text-gray-300'>{title}</div>
      <div className='text-sm font-medium mt-0.5'>{value}</div>
    </div>
  );
}

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
        <div className='space-y-6'>
          <div className='flex flex-col lg:flex-row lg:justify-between lg:items-start p-6 pb-3 rounded-xl'>
            <div className='space-y-4 flex-grow'>
              <div className='border-b border-white/20 pb-3'>
                <div className='text-sm text-gray-300 mb-1'>user</div>
                <div className='flex items-center gap-2'>
                  <span className='text-xl sm:text-2xl md:text-3xl font-medium'>
                    <DisplayAddress chain={chain} address={address} />
                  </span>
                  <CopyAddressButton address={address} size={20} />
                  <FarcasterLink
                    address={address}
                    className='text-gray-400 hover:text-gray-200 transition-colors'
                  />
                  <XLink address={address} />
                </div>
              </div>

              <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-2 max-w-[1400px] mx-auto'>
                <StatCard
                  title='completed bounties'
                  value={accountActivities.data?.NFTs.length ?? 0}
                />
                <StatCard
                  title='total paid'
                  value={`${formatCryptoValue(
                    accountStats.data?.totalPaid.amountCrypto
                  )} ${chain.currency}`}
                />
                <StatCard
                  title='active bounties'
                  value={
                    accountActivities.data?.bounties
                      ? accountActivities.data?.bounties.filter(
                          (bounty) => bounty.inProgress === true
                        ).length
                      : 0
                  }
                />
                <StatCard
                  title='total in contract'
                  value={`${formatCryptoValue(
                    accountStats.data?.amountInContract.amountCrypto
                  )} ${chain.currency}`}
                />
                <StatCard
                  title='completed claims'
                  value={accountStats.data?.acceptedClaimsCount ?? 0}
                />
                <StatCard
                  title='total earned'
                  value={`${formatCryptoValue(
                    accountStats.data?.totalEarn.amountCrypto
                  )} ${chain.currency}`}
                />
              </div>
            </div>

            <div className='mt-3 lg:mt-0 lg:ml-6 p-2 bg-white/5 rounded-lg backdrop-blur-sm text-center'>
              <div className='text-xs text-gray-300'>poidh score</div>
              <div className="text-4xl font-bold mt-1 text-poidhRed font-['PixeloidSans'] ">
                {accountStats.isLoading ? '…' : accountStats.data?.poidhScore}
              </div>
            </div>
          </div>

          <div className='flex flex-row overflow-x-scroll items-center pb-3 border-b border-white justify-center gap-x-5 w-full px-3'>
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
              <BountyList
                bounties={accountActivities.data?.bounties ?? []}
                showStatusEmoji={true}
              />
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

function formatCryptoValue(value: number | undefined) {
  if (value === undefined) return '0';
  const strValue = value.toString();
  if (strValue.includes('.')) {
    const [, decimal] = strValue.split('.');
    if (decimal.length > 5) {
      return Number(value).toFixed(5);
    }
  }
  return strValue;
}
