'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import NftList from '@/components/bounty/NftList';
import { trpc } from '@/trpc/client';
import BountyList from '../bounty/BountyList';
import ClaimsListAccount from './ClaimListAccount';
import CopyAddressButton from '@/components/global/CopyAddressButton';
import DisplayAddress from '@/components/global/DisplayAddress';
import SocialMediaLinks from '@/components/global/SocialMediaLinks';
import { ShareIcon } from '@/components/global/Icons';
import ClaimFundsButton from '@/components/global/ClaimFundsButton';
import { formatAmountShort } from '@/utils/utils';
import InfiniteScroll from 'react-infinite-scroller';
import { ChainId } from '@/utils/types';
import ShareAccountModal from '@/components/account/ShareAccountModal';
import { useAccount } from 'wagmi';
import ZkPassportVerify from '@/components/account/ZkPassportVerify';
import PendingRefunds from '@/components/account/PendingRefunds';

type Section = 'nfts' | 'bounties' | 'claims';
const PAGE_SIZE = 9;

const getSectionFromParam = (value: string | null): Section => {
  if (value === 'nfts' || value === 'bounties' || value === 'claims') {
    return value;
  }
  return 'bounties';
};

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className='bg-white/5 rounded p-1.5 backdrop-blur-sm'>
      <div className='text-[10px] text-gray-300 leading-none'>{title}</div>
      <div className='text-xs sm:text-sm mt-0.5 leading-tight'>{value}</div>
    </div>
  );
}

export default function AccountInfo({ address }: { address: string }) {
  const account = useAccount();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const sectionFromUrl = getSectionFromParam(searchParams.get('tab'));
  const [currentSection, setCurrentSection] = useState<Section>(
    sectionFromUrl ?? 'bounties'
  );
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleSectionChange = (nextSection: Section) => {
    setCurrentSection(nextSection);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', nextSection);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const accountActivitiesCount = trpc.accounts.activitiesCount.useQuery(
    { address },
    { enabled: !!address }
  );

  const accountStats = trpc.accounts.stats.useQuery(
    { address },
    { enabled: !!address }
  );

  const nfts = trpc.accounts.nfts.useInfiniteQuery(
    { address, limit: PAGE_SIZE },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      enabled: !!address && currentSection === 'nfts',
    }
  );

  const claims = trpc.accounts.claims.useInfiniteQuery(
    { address, limit: PAGE_SIZE },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      enabled: !!address && currentSection === 'claims',
    }
  );

  const bounties = trpc.accounts.bounties.useInfiniteQuery(
    { address, limit: PAGE_SIZE },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      enabled: !!address && currentSection === 'bounties',
    }
  );

  const user = trpc.users.fetchByAddress.useQuery(
    { address: account.address as `0x${string}` },
    {
      enabled: !!account.address,
    }
  );

  const updateSliderPosition = useCallback(() => {
    const activeIndex = ['nfts', 'bounties', 'claims'].indexOf(currentSection);
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
  }, [currentSection]);

  useEffect(() => {
    updateSliderPosition();

    document.fonts.ready.then(() => {
      updateSliderPosition();
    });

    window.addEventListener('resize', updateSliderPosition);
    return () => window.removeEventListener('resize', updateSliderPosition);
  }, [currentSection, updateSliderPosition, accountActivitiesCount.data]);

  const isOwnPage = (account.address ?? '').toLowerCase() === address;

  const pendingRefunds = trpc.accounts.pendingRefunds.useQuery(
    { address: address as `0x${string}` },
    { enabled: isOwnPage }
  );

  const pendingRefundIds = new Set(
    (pendingRefunds.data ?? []).map((r) => `${r.bountyId}-${r.chainId}`)
  );

  return (
    <>
      {address && (
        <div className='space-y-3 pb-16'>
          <div className='flex flex-col lg:flex-row lg:justify-between lg:items-start p-6 pb-0 md:pb-3 rounded-xl space-y-2 lg:space-y-0'>
            <div className='space-y-4 flex-grow'>
              <div className='border-b border-white/20 pb-3'>
                <div className='text-sm text-gray-300 mb-1'>user</div>
                <div className='flex items-center gap-2 overflow-visible'>
                  <span className='text-xl sm:text-2xl md:text-3xl'>
                    <DisplayAddress address={address} pfpSize={26} />
                  </span>
                  <CopyAddressButton address={address} size={20} />
                  <SocialMediaLinks address={address} />
                  <button
                    type='button'
                    aria-label='Share profile'
                    title='Share profile'
                    className='hover:text-gray-200 cursor-pointer'
                    onClick={() => {
                      setIsShareModalOpen(true);
                    }}
                  >
                    <ShareIcon size={20} />
                  </button>
                  {isOwnPage && <ZkPassportVerify address={address} />}
                </div>
              </div>

              <div className='grid grid-cols-3 gap-1.5 sm:gap-2 mx-auto'>
                <StatCard
                  title='completed bounties'
                  value={accountActivitiesCount.data?.completedBounties ?? 0}
                />
                <StatCard
                  title='active bounties'
                  value={accountActivitiesCount.data?.activeBounties ?? 0}
                />
                <StatCard
                  title='completed claims'
                  value={accountActivitiesCount.data?.completedClaims ?? 0}
                />
                <StatCard
                  title='eth paid'
                  value={`${formatAmountShort({
                    amount: Number(
                      accountStats.data?.eth.totalPaid.amountCrypto
                    ),
                    precision: 5,
                  })} eth`}
                />
                <StatCard
                  title='eth in contract'
                  value={`${formatAmountShort({
                    amount: Number(
                      accountStats.data?.eth.amountInContract.amountCrypto
                    ),
                    precision: 5,
                  })} eth`}
                />
                <StatCard
                  title='eth earned'
                  value={`${formatAmountShort({
                    amount: Number(
                      accountStats.data?.eth.totalEarn.amountCrypto
                    ),
                    precision: 5,
                  })} eth`}
                />
                <StatCard
                  title='degen paid'
                  value={`${formatAmountShort({
                    amount: Number(
                      accountStats.data?.degen.totalPaid.amountCrypto
                    ),
                  })} dgn`}
                />
                <StatCard
                  title='degen in contract'
                  value={`${formatAmountShort({
                    amount: Number(
                      accountStats.data?.degen.amountInContract.amountCrypto
                    ),
                  })} dgn`}
                />
                <StatCard
                  title='degen earned'
                  value={`${formatAmountShort({
                    amount: Number(
                      accountStats.data?.degen.totalEarn.amountCrypto
                    ),
                  })} dgn`}
                />
              </div>
            </div>

            <div className='mt-3 lg:mt-0 lg:ml-6 p-2 bg-white/5 rounded-lg backdrop-blur-sm text-center'>
              <div className='text-xs text-gray-300'>poidh score</div>
              <div className="text-4xl font-bold mt-1 text-poidhRed font-['PixeloidSans'] [text-shadow:-0.5px_-0.5px_0_white,0.5px_-0.5px_0_white,-0.5px_0.5px_0_white,0.5px_0.5px_0_white]">
                {accountStats.isLoading
                  ? '…'
                  : accountStats.data
                  ? accountStats.data?.poidhScore
                  : '0'}
              </div>
            </div>
          </div>

          {isOwnPage && (
            <div className='flex justify-center px-6 lg:mt-0'>
              <div className='w-full lg:w-[35%] flex flex-col gap-2'>
                {user.data && <ClaimFundsButton user={user.data} />}
                <PendingRefunds address={address} />
              </div>
            </div>
          )}

          <div className='flex flex-row items-center justify-center pb-3 border-b border-white w-full'>
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
                onClick={() => handleSectionChange('nfts')}
                className='relative z-10 flex-grow sm:flex-grow-0 md:px-5 px-3 h-full flex items-center justify-center'
              >
                NFTs({accountActivitiesCount.data?.nfts ?? 0})
              </button>
              <button
                ref={(el) => {
                  tabRefs.current[1] = el;
                }}
                onClick={() => handleSectionChange('bounties')}
                className='relative z-10 flex-grow sm:flex-grow-0 md:px-5 px-3 h-full flex items-center justify-center'
              >
                bounties ({accountActivitiesCount.data?.bounties ?? 0})
              </button>
              <button
                ref={(el) => {
                  tabRefs.current[2] = el;
                }}
                onClick={() => handleSectionChange('claims')}
                className='relative z-10 flex-grow sm:flex-grow-0 md:px-5 px-3 h-full flex items-center justify-center'
              >
                claims ({accountActivitiesCount.data?.claims ?? 0})
              </button>
            </div>
          </div>

          <div>
            {currentSection === 'nfts' && (
              <div className='lg:px-20 px-8'>
                {nfts.data && (
                  <InfiniteScroll
                    loadMore={async () => await nfts.fetchNextPage()}
                    hasMore={nfts.hasNextPage && !nfts.isFetchingNextPage}
                    loader={
                      <div key='loader' className='animate-pulse text-center'>
                        Loading more...
                      </div>
                    }
                    threshold={300}
                  >
                    <NftList
                      key={nfts.data.pages[0]?.items[0]?.id || 'empty-nfts'}
                      NFTs={nfts.data.pages.flatMap((page) =>
                        page.items.map((NFT) => ({
                          id: NFT.id,
                          chainId: NFT.chainId as ChainId,
                          url: NFT.url,
                          title: NFT.title,
                          description: NFT.description,
                          bountyId: NFT.bountyId,
                          issuer: NFT.issuer,
                        }))
                      )}
                    />
                  </InfiniteScroll>
                )}
              </div>
            )}
            {currentSection === 'bounties' && (
              <div>
                {bounties.data && (
                  <InfiniteScroll
                    loadMore={async () => await bounties.fetchNextPage()}
                    hasMore={
                      bounties.hasNextPage && !bounties.isFetchingNextPage
                    }
                    loader={
                      <div key='loader' className='animate-pulse text-center'>
                        Loading more...
                      </div>
                    }
                    threshold={300}
                  >
                    <BountyList
                      key={
                        bounties.data.pages[0]?.items[0]?.id || 'empty-bounties'
                      }
                      bounties={bounties.data.pages.flatMap((page) =>
                        page.items.map((bounty) => ({
                          ...bounty,
                          chainId: bounty.chainId as ChainId,
                        }))
                      )}
                      showStatusEmoji={true}
                    />
                  </InfiniteScroll>
                )}
              </div>
            )}
            {currentSection === 'claims' && (
              <div className='lg:px-20 px-8'>
                {claims.data && (
                  <InfiniteScroll
                    loadMore={async () => await claims.fetchNextPage()}
                    hasMore={claims.hasNextPage && !claims.isFetchingNextPage}
                    loader={
                      <div key='loader' className='animate-pulse text-center'>
                        Loading more...
                      </div>
                    }
                    threshold={300}
                  >
                    <ClaimsListAccount
                      key={claims.data.pages[0]?.items[0]?.id || 'empty-claims'}
                      claims={claims.data.pages.flatMap((page) =>
                        page.items.map((c) => ({
                          ...c,
                          chainId: c.chainId as ChainId,
                        }))
                      )}
                    />
                  </InfiniteScroll>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {isShareModalOpen && (
        <ShareAccountModal
          address={address}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}
    </>
  );
}
