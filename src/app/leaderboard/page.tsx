'use client';

import { trpc } from '@/trpc/client';
import Image from 'next/image';
import { TwitterXIcon } from '@/components/global/Icons';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { useState, useMemo, useEffect, useCallback } from 'react';
import InfiniteScroll from 'react-infinite-scroller';
import {
  FARCASTER_URL,
  TWITTER_URL,
} from '@/components/global/SocialMediaLinks';
import Navbar from '@/components/global/Navbar';
import { UserData } from '@/utils/types';

const formatUserName = (name: string) =>
  name.length >= 12 ? `${name.slice(0, 6)}…${name.slice(-5)}` : name;

function ResolvedAddressCell({ address }: { address: string }) {
  const weiOrEnsOrDegenName = trpc.web3.fetchWeiOrEnsOrDegenName.useQuery({
    address,
  });
  return (
    <span className='relative'>
      {formatUserName(
        weiOrEnsOrDegenName.data?.slice(0, 12) ?? address.slice(0, 7)
      )}
    </span>
  );
}

function getDisplayName(user: UserData): string {
  if (!user) {
    return 'unknown';
  }

  if (user.farcasterTag) return formatUserName(user.farcasterTag);
  if ('wei' in user && user.wei) return formatUserName(user.wei.slice(0, 12));
  if (user.ens) return formatUserName(user.ens.slice(0, 12));
  if (user.degenName) return formatUserName(user.degenName.slice(0, 12));
  return user.address?.slice(0, 7) ?? 'unknown';
}

function UserDisplay({
  user,
  address,
  isLoading = false,
}: {
  user?: UserData;
  address: string;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return <>{formatUserName(address)}</>;
  }

  if (!user) {
    return <ResolvedAddressCell address={address} />;
  }

  const displayName = getDisplayName(user);

  return (
    <span className='inline-flex items-center whitespace-nowrap max-w-full'>
      {user.pfpUrl && (
        <div className='flex-shrink-0 relative overflow-hidden rounded-full mr-2 w-7 h-7'>
          <Image
            src={user.pfpUrl ?? 'https://poidh.xyz/images/unknown.png'}
            alt={displayName || 'User'}
            width={8}
            height={8}
            unoptimized
            className='w-full h-full object-cover'
          />
        </div>
      )}
      <span>{displayName}</span>
    </span>
  );
}

function ScoreCell({
  address,
  className = '',
  children,
}: {
  address: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`/account/${address}`}
      className={`hover:bg-white/10 hover:text-poidhRed transition-all cursor-pointer block w-full h-full ${className}`}
    >
      {children}
    </Link>
  );
}

export default function HighScoresPage() {
  const account = useAccount();
  const [allLeaderboardData, setAllLeaderboardData] = useState<
    [string, { base: number; degen: number; arbitrum: number; total: number }][]
  >([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const leaderboardResult = trpc.leaderboard.fetch.useQuery({
    userAddress: account.address,
    page: currentPage,
    limit: 10,
  });

  const leaderboardData = leaderboardResult.data?.leaderboard;
  const userRankData = leaderboardResult.data?.userData;
  const paginationData = leaderboardResult.data?.pagination;

  useEffect(() => {
    if (leaderboardData && !leaderboardResult.isLoading) {
      setAllLeaderboardData((prev) => {
        if (currentPage === 1) {
          return leaderboardData;
        }
        const existingAddresses = new Set(prev.map(([addr]) => addr));
        const newItems = leaderboardData.filter(
          ([addr]) => !existingAddresses.has(addr)
        );
        return [...prev, ...newItems];
      });
      setHasMore(paginationData?.hasNextPage ?? false);
      setIsLoadingMore(false);
    }
  }, [
    leaderboardData,
    leaderboardResult.isLoading,
    currentPage,
    paginationData?.hasNextPage,
  ]);

  const loadMore = useCallback(() => {
    if (!leaderboardResult.isLoading && !isLoadingMore && hasMore) {
      setIsLoadingMore(true);
      setCurrentPage((prev) => prev + 1);
    }
  }, [leaderboardResult.isLoading, isLoadingMore, hasMore]);

  const allAddresses = useMemo(() => {
    const addresses = Array.from(
      new Set(
        [
          ...(allLeaderboardData?.map(([address]) => address) ?? []),
          ...(userRankData?.data ? [userRankData.data[0]] : []),
          ...(account.isConnected && account.address
            ? [account.address.toLowerCase()]
            : []),
        ].filter(Boolean)
      )
    );
    return addresses;
  }, [allLeaderboardData, userRankData, account.isConnected, account.address]);

  const usersQuery = trpc.neynar.usersData.useQuery(
    {
      addresses: allAddresses,
    },
    {
      enabled: !!allAddresses.length,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      staleTime: 0,
      retry: 2,
      retryDelay: 1000,
    }
  );

  const user = usersQuery.data?.find(
    (user) =>
      user.address.toLocaleLowerCase() === account.address?.toLocaleLowerCase()
  );

  return (
    <div className='min-h-screen bg-gradient-to-b from-[#2a81d5] via-[#70aae2] to-[#6fa9e1] p-6  pb-24 text-white font-mono'>
      <div className='max-w-7xl mx-auto'>
        <header className='text-center mb-10'>
          <h1 className='text-5xl font-mono'>poidh high scores</h1>
        </header>

        <main className='w-full'>
          <div className='hidden md:grid grid-cols-12 items-center bg-poidhRed rounded-full px-6 py-3 text-lg mb-4'>
            <div className='col-span-1 text-center'>rank</div>
            <div className='col-span-4 text-center pl-4'>address</div>
            <div className='col-span-2 text-center'>arbitrum</div>
            <div className='col-span-2 text-center'>base</div>
            <div className='col-span-2 text-center'>degen</div>
            <div className='col-span-1 text-center'>total</div>
          </div>

          <InfiniteScroll
            pageStart={1}
            loadMore={loadMore}
            hasMore={hasMore && !isLoadingMore}
            loader={
              <div className='text-center py-20 text-white/60 animate-pulse'>
                loading…
              </div>
            }
            threshold={200}
          >
            <div className='hidden md:block'>
              <div className='space-y-3'>
                {user && (
                  <div
                    className='
                    flex flex-col bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl px-4 py-3
                    md:grid md:grid-cols-12 md:rounded-full md:px-4 md:py-2
                    transition-transform hover:shadow-xl hover:bg-white/30
                    ring-2 ring-poidhRed/50
                  '
                  >
                    <div className='flex items-center gap-3 mb-2 md:mb-0 md:col-span-1 md:gap-0 md:justify-center'>
                      <div className='flex items-center justify-center bg-poidhRed text-white rounded-full mr-2 w-20 h-10 md:mr-0 text-lg leading-none'>
                        You
                      </div>
                    </div>
                    <Link
                      href={`/account/${user.address}`}
                      className='flex-1 flex items-center justify-start md:col-span-3 md:justify-start pl-2'
                    >
                      <UserDisplay
                        user={user}
                        address={user.address.toLowerCase()}
                        isLoading={usersQuery.isLoading}
                      />
                    </Link>
                    <div className='flex items-center justify-end md:mr-3'>
                      {usersQuery.data && (
                        <div className='flex items-center gap-3'>
                          {user.farcasterTag && (
                            <a
                              href={`${FARCASTER_URL}/${user.farcasterTag}`}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='group inline-flex items-center justify-center w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200 hover:scale-110'
                              aria-label={`Visit ${user.farcasterTag}'s Warpcast profile`}
                            >
                              <Image
                                src='/images/farcaster_arch.svg'
                                alt='Warpcast'
                                width={16}
                                height={18}
                                className='transition-all duration-200 group-hover:opacity-100 opacity-80'
                              />
                            </a>
                          )}
                          {user?.twitterTag && (
                            <a
                              href={`${TWITTER_URL}/${user.twitterTag}`}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='group inline-flex items-center justify-center w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200 hover:scale-110'
                              aria-label={`Visit ${user.twitterTag}'s X profile`}
                            >
                              <div className='text-gray-300 group-hover:text-white transition-colors duration-200'>
                                <TwitterXIcon width={16} height={18} />
                              </div>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    <div className='md:col-span-2 md:border-l border-white/30'>
                      <ScoreCell
                        address={user.address}
                        className='flex justify-between md:justify-center md:text-center md:items-center p-2 md:p-0'
                      >
                        <span className='text-base md:hidden'>arbitrum</span>
                        <span>{userRankData?.data?.[1]?.arbitrum ?? 0}</span>
                      </ScoreCell>
                    </div>
                    <div className='md:col-span-2 md:border-l border-white/30'>
                      <ScoreCell
                        address={user.address}
                        className='flex justify-between md:justify-center md:text-center md:items-center p-2 md:p-0'
                      >
                        <span className='text-base md:hidden'>base</span>
                        <span>{userRankData?.data?.[1]?.base ?? 0}</span>
                      </ScoreCell>
                    </div>
                    <div className='md:col-span-2 md:border-l border-white/30'>
                      <ScoreCell
                        address={user.address}
                        className='flex justify-between md:justify-center md:text-center md:items-center p-2 md:p-0'
                      >
                        <span className='text-base md:hidden'>degen</span>
                        <span>{userRankData?.data?.[1]?.degen ?? 0}</span>
                      </ScoreCell>
                    </div>
                    <div className='flex md:items-center justify-between text-poidhRed md:col-span-1 md:justify-center md:border-l border-white/30 md:text-center'>
                      <span className='text-base md:hidden'>total</span>
                      <span>{userRankData?.data?.[1]?.total ?? 0}</span>
                    </div>
                  </div>
                )}

                {allLeaderboardData?.map(([address, scores], index) => {
                  const rank = index + 1;
                  const currentUser = usersQuery.data?.find(
                    (user) => address === user.address
                  );
                  return (
                    <div
                      key={address}
                      className='
                    flex flex-col bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl px-4 py-3
                    md:grid md:grid-cols-12 md:rounded-full md:px-4 md:py-2
                    transition-transform hover:shadow-xl hover:bg-white/30
                  '
                    >
                      <div className='flex items-center gap-3 mb-2 md:mb-0 md:col-span-1 md:gap-0 md:justify-center'>
                        <div className='flex items-center justify-center bg-white/20 rounded-full mr-2 w-20 h-10 md:mr-0 text-lg leading-none'>
                          {rank}
                        </div>
                      </div>
                      <Link
                        href={`/account/${address}`}
                        className='flex-1 flex items-center justify-start md:col-span-3 md:justify-start pl-2'
                      >
                        <UserDisplay
                          user={currentUser}
                          address={address}
                          isLoading={usersQuery.isLoading}
                        />
                      </Link>
                      <div className='flex items-center justify-end md:mr-4'>
                        {currentUser && (
                          <div className='flex items-center gap-3'>
                            {currentUser.farcasterTag && (
                              <a
                                href={`${FARCASTER_URL}/${currentUser.farcasterTag}`}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='group inline-flex items-center justify-center w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200 hover:scale-110'
                                aria-label={`Visit ${currentUser.farcasterTag}'s Warpcast profile`}
                              >
                                <Image
                                  src='/images/farcaster_arch.svg'
                                  alt='Warpcast'
                                  width={16}
                                  height={18}
                                  className='transition-all duration-200 group-hover:opacity-100 opacity-80'
                                />
                              </a>
                            )}
                            {currentUser.twitterTag && (
                              <a
                                href={`${TWITTER_URL}/${currentUser.twitterTag}`}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='group inline-flex items-center justify-center w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200 hover:scale-110'
                                aria-label={`Visit ${currentUser.twitterTag}'s X profile`}
                              >
                                <div className='text-gray-300 group-hover:text-white transition-colors duration-200'>
                                  <TwitterXIcon width={16} height={18} />
                                </div>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                      <div className='md:col-span-2 md:border-l border-white/30'>
                        <ScoreCell
                          address={address}
                          className='flex justify-between md:justify-center md:text-center md:items-center p-2 md:p-0'
                        >
                          <span className='text-base md:hidden'>arbitrum</span>
                          <span>{scores.arbitrum}</span>
                        </ScoreCell>
                      </div>
                      <div className='md:col-span-2 md:border-l border-white/30'>
                        <ScoreCell
                          address={address}
                          className='flex justify-between md:justify-center md:text-center md:items-center p-2 md:p-0'
                        >
                          <span className='text-base md:hidden'>base</span>
                          <span>{scores.base}</span>
                        </ScoreCell>
                      </div>
                      <div className='md:col-span-2 md:border-l border-white/30'>
                        <ScoreCell
                          address={address}
                          className='flex justify-between md:justify-center md:text-center md:items-center p-2 md:p-0'
                        >
                          <span className='text-base md:hidden'>degen</span>
                          <span>{scores.degen}</span>
                        </ScoreCell>
                      </div>
                      <div className='flex md:items-center justify-between text-poidhRed md:col-span-1 md:justify-center md:border-l border-white/30 md:text-center'>
                        <span className='text-base md:hidden'>total</span>
                        <span>{scores.total}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className='md:hidden'>
              {account.isConnected && account.address && (
                <LeaderboardCardMobile
                  key={`user-${account.address}`}
                  rank='You'
                  address={account.address}
                  scores={{
                    arbitrum: userRankData?.data?.[1]?.arbitrum ?? 0,
                    base: userRankData?.data?.[1]?.base ?? 0,
                    degen: userRankData?.data?.[1]?.degen ?? 0,
                    total: userRankData?.data?.[1]?.total ?? 0,
                  }}
                  user={user}
                  isCurrentUser={true}
                  isLoading={usersQuery.isLoading}
                />
              )}

              {allLeaderboardData?.map(([address, scores], index) => {
                const rank = index + 1;
                const currentUser = usersQuery.data?.find(
                  (user) => address === user.address
                );

                return (
                  <LeaderboardCardMobile
                    key={address}
                    rank={rank}
                    address={address}
                    scores={scores}
                    user={currentUser}
                    isLoading={usersQuery.isLoading}
                  />
                );
              })}
            </div>
          </InfiniteScroll>
        </main>
      </div>
      <Navbar type='bounty' />
    </div>
  );
}

function LeaderboardCardMobile({
  rank,
  address,
  scores,
  user,
  isCurrentUser = false,
  isLoading = false,
}: {
  rank: number | string;
  address: string;
  scores: {
    base: number;
    degen: number;
    arbitrum: number;
    total: number;
  };
  user?: UserData;
  isCurrentUser?: boolean;
  isLoading?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border mb-4 ${
        isCurrentUser
          ? 'border-poidhRed bg-poidhRed/10'
          : 'border-white/20 bg-white/10'
      }`}
    >
      <div className='flex items-center gap-4 border-b border-white/20 justify-between px-2 py-3'>
        <div
          className={`flex items-center justify-center rounded-full border text-lg leading-none w-16 h-10 ${
            isCurrentUser
              ? 'bg-poidhRed text-white border-poidhRed'
              : 'bg-white/20 border-white/60 text-white'
          }`}
        >
          {rank}
        </div>
        <Link
          href={`/account/${address}`}
          className='text-lg text-white flex-1 flex items-center justify-start'
        >
          <UserDisplay user={user} address={address} isLoading={isLoading} />
        </Link>
        {user && (
          <div className='flex items-center gap-2'>
            {user.farcasterTag && (
              <a
                href={`${FARCASTER_URL}/${user.farcasterTag}`}
                target='_blank'
                rel='noopener noreferrer'
                className='group inline-flex items-center justify-center w-7 h-7 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200 hover:scale-110'
                aria-label={`Visit ${user.farcasterTag}'s Warpcast profile`}
              >
                <Image
                  src='/images/farcaster_arch.svg'
                  alt='Warpcast'
                  width={14}
                  height={16}
                  className='transition-all duration-200 group-hover:opacity-100 opacity-80'
                />
              </a>
            )}
            {user.farcasterTag && (
              <a
                href={`${TWITTER_URL}/${user.twitterTag}`}
                target='_blank'
                rel='noopener noreferrer'
                className='group inline-flex items-center justify-center w-7 h-7 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200 hover:scale-110'
                aria-label={`Visit ${user.twitterTag}'s X profile`}
              >
                <div className='text-gray-300 transition-colors duration-200'>
                  <TwitterXIcon width={14} height={16} />
                </div>
              </a>
            )}
          </div>
        )}
      </div>
      <div className='flex flex-col gap-2'>
        <div className='flex items-center text-white text-lg border-b border-white/20'>
          <div className='flex-1'>
            <ScoreCell
              address={address}
              className='flex items-center justify-between px-4 py-3'
            >
              <span className='w-20'>arbitrum</span>
              <span className='w-14 text-right'>{scores.arbitrum}</span>
            </ScoreCell>
          </div>
          <div className='h-6 border-r border-white/30 mx-4' />
          <div className='flex-1'>
            <ScoreCell
              address={address}
              className='flex items-center justify-between px-4 py-3'
            >
              <span className='w-12'>base</span>
              <span className='w-14 text-right'>{scores.base}</span>
            </ScoreCell>
          </div>
        </div>
        <div className='flex items-center text-white text-lg'>
          <div className='flex-1'>
            <ScoreCell
              address={address}
              className='flex items-center justify-between px-4 py-3'
            >
              <span className='w-20'>degen</span>
              <span className='w-14 text-right'>{scores.degen}</span>
            </ScoreCell>
          </div>
          <div className='h-6 border-r border-white/30 mx-4' />
          <div className='flex-1 flex items-center justify-between px-2'>
            <span className='w-12 text-poidhRed'>total</span>
            <span className='w-14 text-right text-poidhRed'>
              {scores.total}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
