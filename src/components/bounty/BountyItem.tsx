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

  const amount = formatEther(
    BigInt(bounty.amount)
  ).toString();

  const rewardDisplay = formatSortAmount({
    amount,
    usdAmount: bounty.amountSort,
    currency: chain.currency,
    precision: 5,
  });

  const getStatusEmoji = () => {
    if (bounty.isCanceled) return '❌';
    if (bounty.inProgress === false) return '✅';

    return '💰';
  };

  return (
    <Link
      href={`/${chain.slug}/bounty/${bounty.id}`}
      className='block h-[300px] sm:h-[310px]'
    >
      <div className='relative p-[2px] rounded-xl h-full'>
        <div className='p-5 flex flex-col relative z-20 h-full lg:col-span-4'>
          <div className='z-[-1] absolute w-full h-full left-0 top-0 borderBox rounded-[6px] bg-whiteblue' />

          {showStatusEmoji && (
            <div className='absolute top-4 right-4 z-30 text-xl'>
              {getStatusEmoji()}
            </div>
          )}

          {/* Creator */}
          <div
            className={`h-5 mb-3 min-w-0 font-mono text-sm font-semibold opacity-80 ${
              showStatusEmoji ? 'pr-8' : ''
            }`}
          >
            <DisplayAddress
              address={bounty.issuer}
              pfpSize={20}
              showPfpIfExists
              showFallbackPfp
              showLoadingSkeleton
              linkToProfile={false}
            />
          </div>

          {/* Title always reserves exactly two lines */}
          <h3
            className='font-mono text-base sm:text-lg font-bold leading-snug normal-case text-left line-clamp-2 h-[44px] sm:h-[50px] overflow-hidden flex-shrink-0'
            title={bounty.title}
          >
            {bounty.title}
          </h3>

          {/* Description takes the remaining available space */}
          <div
            className='mt-3 flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden overscroll-y-contain touch-pan-y pr-2'
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor:
                'rgba(255, 255, 255, 0.22) transparent',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <p className='normal-case whitespace-pre-line text-left leading-6 opacity-90'>
              {stripMarkdown(bounty.description)}
            </p>
          </div>

          {/* Reward */}
          <div className='mt-5 flex-shrink-0 flex items-center justify-between gap-3'>
            <div className='min-w-0 font-mono text-xl font-bold leading-none tracking-tight whitespace-nowrap'>
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
