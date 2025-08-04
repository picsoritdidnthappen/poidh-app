'use client';

import React from 'react';
import { trpc } from '@/trpc/client';
import useDegenOrEnsName from '@/hooks/useDegenOrEnsName';
import Image from 'next/image';
import { TwitterXIcon } from '@/components/global/Icons';
import { inferRouterOutputs } from '@trpc/server';
import { AppRouter } from '@/trpc/routers/_app';

function ResolvedAddressCell({ address }: { address: string }) {
  const ensOrDegenName = useDegenOrEnsName(address);

  const formatUserNames = (name: string) =>
    `${name.slice(0, 6)}…${name.slice(-5)}`;

  return (
    <span className='relative'>
      {formatUserNames(ensOrDegenName ?? address)}
    </span>
  );
}

export default function HighScoresPage() {
  const leaderboardData = trpc.leaderboard.useQuery().data;

  const usersDataNeynar = trpc.usersDataNeynar.useQuery(
    {
      addresses: leaderboardData?.map(([address, _]) => address) ?? [],
    },
    {
      enabled: !!leaderboardData,
    }
  );

  return (
    <div className='min-h-screen bg-gradient-to-b from-[#2a81d5] via-[#70aae2] to-[#6fa9e1] p-6 text-white font-mono'>
      <div className='max-w-7xl mx-auto'>
        <header className='text-center mb-10'>
          <h1 className='text-5xl'>poidh high scores</h1>
        </header>

        <main className='w-full'>
          <div className='hidden md:grid grid-cols-12 items-center bg-[#F15E5F] rounded-full px-6 py-3 text-lg mb-4'>
            <div className='col-span-1 text-center'>rank</div>
            <div className='col-span-4 text-center pl-4'>address</div>
            <div className='col-span-2 text-center'>arbitrum</div>
            <div className='col-span-2 text-center'>base</div>
            <div className='col-span-2 text-center'>degen</div>
            <div className='col-span-1 text-center'>total</div>
          </div>

          <div className='hidden md:block'>
            <div className='space-y-3'>
              {leaderboardData?.map(([address, scores], index) => (
                <div
                  key={address}
                  className='
                    flex flex-col bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl px-4 py-3
                    md:grid md:grid-cols-12 md:rounded-full md:px-4 md:py-2
                    transition-transform hover:shadow-xl hover:bg-white/30
                  '
                >
                  <div className='flex items-center gap-3 mb-2 md:mb-0 md:col-span-1 md:gap-0 md:justify-center'>
                    <div className='flex items-center justify-center bg-white/20 rounded-full mr-2 w-20 h-10 md:mr-0'>
                      {index + 1}
                    </div>
                  </div>
                  <div className='flex-1 flex items-center justify-start md:col-span-3 md:justify-start'>
                    <ResolvedAddressCell address={address} />
                  </div>
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
                              src='/images/farcaster_arch_v2.svg'
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
                  <div className='flex justify-between md:col-span-2 md:justify-center md:border-l border-white/30 md:text-center md:items-center'>
                    <span className='text-base md:hidden'>arbitrum</span>
                    <span>{scores.arbitrum}</span>
                  </div>
                  <div className='flex justify-between md:col-span-2 md:justify-center md:border-l border-white/30 md:text-center md:items-center'>
                    <span className='text-base md:hidden'>base</span>
                    <span>{scores.base}</span>
                  </div>
                  <div className='flex justify-between md:col-span-2 md:justify-center md:border-l border-white/30 md:text-center md:items-center'>
                    <span className='text-base md:hidden'>degen</span>
                    <span>{scores.degen}</span>
                  </div>
                  <div className='flex md:items-center justify-between text-[#F15E5F] md:col-span-1 md:justify-center md:border-l border-white/30 md:text-center'>
                    <span className='text-base md:hidden'>total</span>
                    <span>{scores.total}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className='md:hidden'>
            {leaderboardData?.map(([address, scores], index) => (
              <LeaderboardCardMobile
                key={address}
                rank={index + 1}
                address={address}
                scores={scores}
                userData={usersDataNeynar.data?.[address]}
              />
            ))}
          </div>
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
}: {
  rank: number;
  address: string;
  scores: {
    base: number;
    degen: number;
    arbitrum: number;
    total: number;
  };
  userData?: inferRouterOutputs<AppRouter>['usersDataNeynar'][string];
}) {
  return (
    <div className='rounded-2xl border border-white/20 bg-white/10 mb-4'>
      <div className='flex items-center gap-4 border-b border-white/20 justify-between px-2 py-3'>
        <div className='py-1 px-6 flex items-center justify-center bg-white/20 rounded-full border border-white/60 text-white text-xl'>
          {rank}
        </div>
        <div className='text-lg text-white flex-1 flex items-center justify-start'>
          <ResolvedAddressCell address={address} />
        </div>
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
                  src='/images/farcaster_arch_v2.svg'
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
        <div className='flex items-center text-white text-lg border-b border-white/20 p-2'>
          <div className='flex-1 flex items-center justify-between px-2 py-1'>
            <span className='w-20'>arbitrum</span>
            <span className='w-14 text-right'>{scores.arbitrum}</span>
          </div>
          <div className='h-6 border-r border-white/30 mx-4' />
          <div className='flex-1 flex items-center justify-between px-2'>
            <span className='w-12'>base</span>
            <span className='w-14 text-right'>{scores.base}</span>
          </div>
        </div>
        <div className='flex items-center text-white text-lg p-2'>
          <div className='flex-1 flex items-center justify-between px-2'>
            <span className='w-20'>degen</span>
            <span className='w-14 text-right'>{scores.degen}</span>
          </div>
          <div className='h-6 border-r border-white/30 mx-4' />
          <div className='flex-1 flex items-center justify-between px-2'>
            <span className='w-12 text-[#F15E5F]'>total</span>
            <span className='w-14 text-right text-[#F15E5F]'>
              {scores.total}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
