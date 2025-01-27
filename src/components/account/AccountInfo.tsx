'use client';

import { useState } from 'react';

import { useGetChain } from '@/hooks/useGetChain';
import BountyList from '@/components/ui/BountyList';
import { trpc } from '@/trpc/client';
import { cn } from '@/utils';
import { formatWalletAddress } from '@/utils/web3';
import FilterButton from '@/components/ui/FilterButton';
import NftList from '../nft/NftList';
import ClaimsListAccount from '../claim/ClaimListAccount';
import { useAccount } from 'wagmi';
import { AddIcon, TwitterXIcon, FarcasterIcon } from '../global/Icons';
import AddSocial from '@/components/ui/AddSocial';

type Section = 'nfts' | 'bounties' | 'claims';

export default function AccountInfo({ address }: { address: string }) {
  const chain = useGetChain();
  const userAddress = useAccount();

  const [currentSection, setCurrentSection] = useState<Section>('nft');
  const [showAddSocial, setShowAddSocial] = useState(false);

  const accountActivities = trpc.accountActivities.useQuery(
    { address, chainId: chain.id },
    { enabled: !!address }
  );

  const accountStats = trpc.accountInfo.useQuery(
    { address, chainId: chain.id },
    { enabled: !!address }
  );

  const accoutSocials = trpc.accountSocials.useQuery({
    address,
  });

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
                  {userAddress.address?.toLowerCase() === address && (
                    <div
                      onClick={() => setShowAddSocial(true)}
                      className='flex items-center gap-1 px-3 py-1.5 hover:text-[#F15E5F] transition-colors duration-200 hover:cursor-pointer'
                    >
                      <AddIcon width={32} height={32} /> Social
                    </div>
                  )}
                </div>
                <div className='flex items-center gap-2'>
                  {accoutSocials.data?.twitter && (
                    <a
                      className='opacity-40 hover:opacity-100 transition-opacity cursor-pointer'
                      href={accoutSocials.data.twitter ?? ''}
                      title='Add Twitter'
                    >
                      <TwitterXIcon width={28} height={28} />
                    </a>
                  )}
                  {accoutSocials.data?.farcaster && (
                    <a
                      className='opacity-40 hover:opacity-100 transition-opacity cursor-pointer'
                      href={accoutSocials.data.farcaster ?? ''}
                      title='Add Farcaster'
                    >
                      <FarcasterIcon width={28} height={28} />
                    </a>
                  )}
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
              NFTs ({accountActivities.data?.NFTs.length ?? 0})
            </FilterButton>
            <FilterButton
              onClick={() => setCurrentSection('bounties')}
              show={currentSection !== 'bounties'}
            >
              bounties ({accountActivities.data?.bounties.length ?? 0})
            </FilterButton>
            <FilterButton
              onClick={() => setCurrentSection('claims')}
              show={currentSection !== 'claims'}
            >
              claims ({accountActivities.data?.claims.length ?? 0})
            </FilterButton>
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
      <AddSocial
        open={showAddSocial}
        onClose={() => setShowAddSocial(false)}
        address={address}
      />
    </>
  );
}

export function formatAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
