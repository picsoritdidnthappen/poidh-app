'use client';

import Link from 'next/link';
import { formatEther } from 'viem';

import { formatSortAmount, stripMarkdown } from '@/utils/utils';
import DynamicChainIcon from '@/components/global/DynamicChainIcon';
import DisplayAddress from '@/components/global/DisplayAddress';
import { getChainById } from '@/utils/config';
import { Bounty } from '@/utils/types';

export default function BountyItem({
  bounty,
  showStatusEmoji = false,
  showChainIcon = false,
}: {
  bounty: Bounty;
  showStatusEmoji?: boolean;
  showChainIcon?: boolean;
}) {
  const chain = getChainById({
    chainId: bounty.chainId,
  });

  const amount =
    formatEther(BigInt(bounty.amount)).toString();

  const rewardDisplay = formatSortAmount({
    amount,
    usdAmount: bounty.amountSort,
    currency: chain.currency,
    precision: 5,
  }).toUpperCase();

  const getStatusEmoji = () => {
    if (bounty.isCanceled) return '❌';
    if (bounty.inProgress === false) return '✅';
    return '💰';
  };

  return (
    <Link
      href={`/${chain.slug}/bounty/${bounty.id}`}
      className='block h-full'
    >
      <div className='relative p-[2px] h-full min-h-[390px] sm:min-h-[410px] rounded-xl'>
        <div className='p-5 flex flex-col relative z-20 h-full lg:col-span-4'>
          <div className='z-[-1] absolute w-full h-full left-0 top-0 borderBox rounded-[6px] bg-whiteblue' />

          {showStatusEmoji && (
            <div className='absolute top-4 right-4 z-30 text-xl'>
              {getStatusEmoji()}
            </div>
          )}

          <div
            className={`mb-4 min-w-0 font-mono text-sm font-semibold opacity-80 ${
              showStatusEmoji ? 'pr-8' : ''
            }`}
          >
            <DisplayAddress
              address={bounty.issuer}
              pfpSize={22}
              showPfpIfExists
              showFallbackPfp
              linkToProfile={false}
            />
          </div>

          <h3
            className='font-mono text-base sm:text-lg font-bold leading-snug normal-case text-left line-clamp-2 min-h-[2.75rem]'
            title={bounty.title}
          >
            {bounty.title}
          </h3>

          <div
            className='mt-4 mb-5 h-32 sm:h-36 w-full overflow-y-auto overflow-x-hidden overscroll-y-contain touch-pan-y pr-2'
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor:
                'rgba(255, 255, 255, 0.25) transparent',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <p className='normal-case whitespace-pre-line text-left leading-6 opacity-90'>
              {stripMarkdown(bounty.description)}
            </p>
          </div>

          <div className='mt-auto pt-3 flex items-center justify-between gap-3'>
            <div className='font-mono text-xl sm:text-2xl font-bold leading-none tracking-tight whitespace-nowrap'>
              {rewardDisplay}
            </div>

            {showChainIcon && (
              <div className='flex-shrink-0'>
                <DynamicChainIcon
                  chain={chain.slug}
                  size={
                    chain.slug === 'base'
                      ? 22
                      : 28
                  }
                />
              </div>
            )}
          </div>
        </div>

        <div className='z-10 bg-gradient rounded-[8px] h-full w-full absolute top-0 right-0 bottom-0 left-0' />
      </div>
    </Link>
  );
}
