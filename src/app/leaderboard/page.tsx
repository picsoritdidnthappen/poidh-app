'use client';

import { trpc } from '@/trpc/client';
import useDegenOrEnsName from '@/hooks/useDegenOrEnsName';
import Image from 'next/image';
import { TwitterXIcon } from '@/components/global/Icons';
import { inferRouterOutputs } from '@trpc/server';
import { AppRouter } from '@/trpc/trpc';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { Netname } from '@/utils/types';
import { useState, useMemo } from 'react';

type UserDataNeynar =
  inferRouterOutputs<AppRouter>['neynar']['usersData'][string];

const formatUserName = (name: string) =>
  name.length >= 10 ? `${name.slice(0, 6)}…${name.slice(-5)}` : name;

function ResolvedAddressCell({ address }: { address: string }) {
  const ensOrDegenName = useDegenOrEnsName(address);
  return (
    <span className='relative'>
      {formatUserName(ensOrDegenName ?? address)}
    </span>
  );
}

function UserDisplay({
  userData,
  address,
  isLoading = false,
}: {
  userData?: inferRouterOutputs<AppRouter>['neynar']['usersData'][string];
  address: string;
  isLoading?: boolean;
}) {
  const user = userData?.[0];

  if (user) {
    return (
      <span className='inline-flex items-center whitespace-nowrap max-w-full'>
        {user.pfp_url && (
          <div className='flex-shrink-0 relative overflow-hidden rounded-full mr-2 w-7 h-7'>
            <Image
              src={user.pfp_url ?? 'https://poidh.xyz/images/unknown.png'}
              alt={user.display_name ?? 'User'}
              width={8}
              height={8}
              unoptimized
              className='w-full h-full object-cover'
            />
          </div>
        )}
        <span>
          {user.username.length > 10
            ? `${user.username.slice(0, 6)}…${user.username.slice(-5)}`
            : user.username}
        </span>
      </span>
    );
  }

  if (isLoading) return <>{formatUserName(address)}</>;

  return <ResolvedAddressCell address={address} />;
}

function ScoreCell({
  chain,
  address,
  score,
  className = '',
  children,
}: {
  chain: Netname;
  address: string;
  score: number;
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
  const [currentPage, setCurrentPage] = useState(1);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const leaderboardResult = trpc.leaderboard.fetch.useQuery({
    userAddress: account.address,
    page: currentPage,
    limit: 10,
  });

  const leaderboardData = leaderboardResult.data?.leaderboard;
  const userRankData = leaderboardResult.data?.userData;
  const paginationData = leaderboardResult.data?.pagination;

  const allAddresses = useMemo(() => {
    const addresses = Array.from(
      new Set(
        [
          ...(leaderboardData?.map(([address]) => address) ?? []),
          ...(userRankData?.data ? [userRankData.data[0]] : []),
          ...(account.isConnected && account.address
            ? [account.address.toLowerCase()]
            : []),
        ].filter(Boolean)
      )
    );
    return addresses;
  }, [leaderboardData, userRankData, account.isConnected, account.address]);

  const usersDataNeynar = trpc.neynar.usersData.useQuery(
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

  return (
    <div className='min-h-screen bg-gradient-to-b from-[#2a81d5] via-[#70aae2] to-[#6fa9e1] p-6 text-white font-mono'>
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

          <div className='hidden md:block'>
            <div className='space-y-3'>
              {account.isConnected && account.address && (
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
                    href={`/account/${account.address}`}
                    className='flex-1 flex items-center justify-start md:col-span-3 md:justify-start pl-2'
                  >
                    <UserDisplay
                      userData={
                        usersDataNeynar.data?.[account.address.toLowerCase()]
                      }
                      address={account.address.toLowerCase()}
                      isLoading={usersDataNeynar.isLoading}
                    />
                  </Link>
                  <div className='flex items-center justify-end md:mr-3'>
                    {usersDataNeynar.data && (
                      <div className='flex items-center gap-3'>
                        {usersDataNeynar.data[
                          account.address.toLowerCase()
                        ]?.[0]?.username && (
                          <a
                            href={`https://warpcast.com/${
                              usersDataNeynar.data[
                                account.address.toLowerCase()
                              ][0].username
                            }`}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='group inline-flex items-center justify-center w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200 hover:scale-110'
                            aria-label={`Visit ${
                              usersDataNeynar.data[
                                account.address.toLowerCase()
                              ][0].username
                            }'s Warpcast profile`}
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
                        {usersDataNeynar.data[
                          account.address
                        ]?.[0]?.verified_accounts?.find(
                          (accountData) => accountData.platform === 'x'
                        )?.username && (
                          <a
                            href={`https://x.com/${
                              usersDataNeynar.data[
                                account.address
                              ]?.[0]?.verified_accounts?.find(
                                (accountData) => accountData.platform === 'x'
                              )?.username
                            }`}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='group inline-flex items-center justify-center w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200 hover:scale-110'
                            aria-label={`Visit ${
                              usersDataNeynar.data[
                                account.address
                              ]?.[0]?.verified_accounts?.find(
                                (accountData) => accountData.platform === 'x'
                              )?.username
                            }'s X profile`}
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
                      chain='arbitrum'
                      address={account.address}
                      score={userRankData?.data?.[1]?.arbitrum ?? 0}
                      className='flex justify-between md:justify-center md:text-center md:items-center p-2 md:p-0'
                    >
                      <span className='text-base md:hidden'>arbitrum</span>
                      <span>{userRankData?.data?.[1]?.arbitrum ?? 0}</span>
                    </ScoreCell>
                  </div>
                  <div className='md:col-span-2 md:border-l border-white/30'>
                    <ScoreCell
                      chain='base'
                      address={account.address}
                      score={userRankData?.data?.[1]?.base ?? 0}
                      className='flex justify-between md:justify-center md:text-center md:items-center p-2 md:p-0'
                    >
                      <span className='text-base md:hidden'>base</span>
                      <span>{userRankData?.data?.[1]?.base ?? 0}</span>
                    </ScoreCell>
                  </div>
                  <div className='md:col-span-2 md:border-l border-white/30'>
                    <ScoreCell
                      chain='degen'
                      address={account.address}
                      score={userRankData?.data?.[1]?.degen ?? 0}
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

              {leaderboardData?.map(([address, scores], index) => {
                const rank = (currentPage - 1) * 10 + index + 1;
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
                        userData={usersDataNeynar.data?.[address]}
                        address={address}
                        isLoading={usersDataNeynar.isLoading}
                      />
                    </Link>
                    <div className='flex items-center justify-end md:mr-4'>
                      {usersDataNeynar.data && (
                        <div className='flex items-center gap-3'>
                          {usersDataNeynar.data[address]?.[0]?.username && (
                            <a
                              href={`https://warpcast.com/${usersDataNeynar.data[address][0].username}`}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='group inline-flex items-center justify-center w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200 hover:scale-110'
                              aria-label={`Visit ${usersDataNeynar.data[address][0].username}'s Warpcast profile`}
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
                          {usersDataNeynar.data[
                            address
                          ]?.[0]?.verified_accounts?.find(
                            (account) => account.platform === 'x'
                          )?.username && (
                            <a
                              href={`https://x.com/${
                                usersDataNeynar.data[
                                  address
                                ][0].verified_accounts.find(
                                  (account) => account.platform === 'x'
                                )?.username
                              }`}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='group inline-flex items-center justify-center w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200 hover:scale-110'
                              aria-label={`Visit ${
                                usersDataNeynar.data[
                                  address
                                ][0].verified_accounts.find(
                                  (account) => account.platform === 'x'
                                )?.username
                              }'s X profile`}
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
                        chain='arbitrum'
                        address={address}
                        score={scores.arbitrum}
                        className='flex justify-between md:justify-center md:text-center md:items-center p-2 md:p-0'
                      >
                        <span className='text-base md:hidden'>arbitrum</span>
                        <span>{scores.arbitrum}</span>
                      </ScoreCell>
                    </div>
                    <div className='md:col-span-2 md:border-l border-white/30'>
                      <ScoreCell
                        chain='base'
                        address={address}
                        score={scores.base}
                        className='flex justify-between md:justify-center md:text-center md:items-center p-2 md:p-0'
                      >
                        <span className='text-base md:hidden'>base</span>
                        <span>{scores.base}</span>
                      </ScoreCell>
                    </div>
                    <div className='md:col-span-2 md:border-l border-white/30'>
                      <ScoreCell
                        chain='degen'
                        address={address}
                        score={scores.degen}
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
                userData={usersDataNeynar.data?.[account.address.toLowerCase()]}
                isCurrentUser={true}
                isLoading={usersDataNeynar.isLoading}
              />
            )}

            {leaderboardData?.map(([address, scores], index) => {
              const rank = (currentPage - 1) * 10 + index + 1;
              return (
                <LeaderboardCardMobile
                  key={address}
                  rank={rank}
                  address={address}
                  scores={scores}
                  userData={usersDataNeynar.data?.[address.toLowerCase()]}
                  isLoading={usersDataNeynar.isLoading}
                />
              );
            })}
          </div>

          {paginationData && paginationData.totalPages > 1 && (
            <div className='flex justify-center items-center gap-2 mt-8 px-4'>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={
                  !paginationData.hasPreviousPage || leaderboardResult.isLoading
                }
                className={`px-3 md:px-4 py-3 md:py-2 rounded-lg font-mono transition-all text-sm md:text-base touch-manipulation ${
                  paginationData.hasPreviousPage && !leaderboardResult.isLoading
                    ? 'bg-white/20 hover:bg-white/30 active:bg-white/40 text-white cursor-pointer'
                    : 'bg-white/10 text-white/50 cursor-not-allowed'
                }`}
              >
                <span className='hidden md:inline'>← Previous</span>
                <span className='md:hidden'>←</span>
              </button>

              <div className='flex items-center gap-1 justify-center'>
                {[...Array(Math.min(paginationData.totalPages, 5))].map(
                  (_, i) => {
                    const pageNum =
                      Math.max(
                        1,
                        Math.min(paginationData.totalPages - 4, currentPage - 2)
                      ) + i;
                    if (pageNum > paginationData.totalPages) return null;

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        disabled={leaderboardResult.isLoading}
                        className={`w-12 h-12 md:w-10 md:h-10 rounded-lg font-mono transition-all text-sm md:text-base touch-manipulation ${
                          pageNum === currentPage
                            ? 'bg-poidhRed text-white shadow-lg'
                            : leaderboardResult.isLoading
                            ? 'bg-white/10 text-white/50 cursor-not-allowed'
                            : 'bg-white/20 hover:bg-white/30 active:bg-white/40 text-white cursor-pointer'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                )}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={
                  !paginationData.hasNextPage || leaderboardResult.isLoading
                }
                className={`px-3 md:px-4 py-3 md:py-2 rounded-lg font-mono transition-all text-sm md:text-base touch-manipulation ${
                  paginationData.hasNextPage && !leaderboardResult.isLoading
                    ? 'bg-white/20 hover:bg-white/30 active:bg-white/40 text-white cursor-pointer'
                    : 'bg-white/10 text-white/50 cursor-not-allowed'
                }`}
              >
                <span className='hidden md:inline'>Next →</span>
                <span className='md:hidden'>→</span>
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function LeaderboardCardMobile({
  rank,
  address,
  scores,
  userData,
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
  userData?: UserDataNeynar;
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
          <UserDisplay
            userData={userData}
            address={address}
            isLoading={isLoading}
          />
        </Link>
        {userData && (
          <div className='flex items-center gap-2'>
            {userData[0]?.username && (
              <a
                href={`https://warpcast.com/${userData[0].username}`}
                target='_blank'
                rel='noopener noreferrer'
                className='group inline-flex items-center justify-center w-7 h-7 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200 hover:scale-110'
                aria-label={`Visit ${userData[0].username}'s Warpcast profile`}
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
            {userData[0]?.verified_accounts?.find(
              (account) => account.platform === 'x'
            )?.username && (
              <a
                href={`https://x.com/${
                  userData[0].verified_accounts.find(
                    (account) => account.platform === 'x'
                  )?.username
                }`}
                target='_blank'
                rel='noopener noreferrer'
                className='group inline-flex items-center justify-center w-7 h-7 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200 hover:scale-110'
                aria-label={`Visit ${
                  userData[0].verified_accounts.find(
                    (account) => account.platform === 'x'
                  )?.username
                }'s X profile`}
              >
                <div className='text-gray-300 group-hover:text-white transition-colors duration-200'>
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
              chain='arbitrum'
              address={address}
              score={scores.arbitrum}
              className='flex items-center justify-between px-4 py-3'
            >
              <span className='w-20'>arbitrum</span>
              <span className='w-14 text-right'>{scores.arbitrum}</span>
            </ScoreCell>
          </div>
          <div className='h-6 border-r border-white/30 mx-4' />
          <div className='flex-1'>
            <ScoreCell
              chain='base'
              address={address}
              score={scores.base}
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
              chain='degen'
              address={address}
              score={scores.degen}
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
