'use client';
import Link from 'next/link';
import { formatEther } from 'viem';

import { UsersRoundIcon } from '@/components/global/Icons';
import { formatAmount } from '@/utils/utils';
import DynamicChainIcon from '@/components/global/DynamicChainIcon';
import { ChainId } from '@/utils/types';
import { getChainById } from '@/utils/config';
import { trpc } from '@/trpc/client';

interface Bounty {
  id: string;
  chainId: ChainId;
  title: string;
  description: string;
  amount: string;
  isMultiplayer: boolean;
  inProgress?: boolean;
  isCanceled?: boolean;
}

export default function BountyItem({
  bounty,
  showStatusEmoji = false,
  showChainIcon = false,
}: {
  bounty: Bounty;
  showStatusEmoji?: boolean;
  showChainIcon?: boolean;
}) {
  const chain = getChainById({ chainId: bounty.chainId });
  const price =
    trpc.fetchPrice.useQuery({ currency: chain.currency }).data ?? 0;
  const amount = formatEther(BigInt(bounty.amount)).toString();

  const getStatusEmoji = () => {
    if (bounty.isCanceled) return '❌';
    if (bounty.inProgress === false) return '✅';
    return '💰';
  };

  return (
    <>
      <Link href={`/${chain.slug}/bounty/${bounty.id}`}>
        <div className='relative p-[2px] h-fit rounded-xl'>
          <div className='p-5 flex flex-col justify-between relative z-20 h-full lg:col-span-4'>
            <div className='z-[-1] absolute w-full h-full left-0 top-0 borderBox rounded-[6px] bg-whiteblue'></div>
            {showStatusEmoji && (
              <div className='absolute top-4 right-4 z-30 text-xl'>
                {getStatusEmoji()}
              </div>
            )}
            <h3 className='normal-case text-nowrap overflow-ellipsis overflow-hidden'>
              {bounty.title}
            </h3>
            <p className='my-5 normal-case w-full h-28 overflow-y-auto overflow-hidden overflow-ellipsis'>
              {bounty.description}
            </p>
            <div
              className={`flex items-end justify-between ${
                !showChainIcon ? 'mt-5' : 'mt-1'
              }`}
            >
              <div className='flex gap-2 items-center'>
                <div>
                  {formatAmount({
                    amount,
                    currency: chain.currency,
                    price: price.toString(),
                    precision: 5,
                  })}
                </div>
                {bounty.isMultiplayer && <UsersRoundIcon />}
              </div>
              {showChainIcon && (
                <DynamicChainIcon
                  chain={chain.slug}
                  size={chain.slug === 'base' ? 22 : 30}
                />
              )}
            </div>
          </div>
          <div className='z-10 bg-gradient rounded-[8px] h-full w-full absolute top-0 right-0 bottom-0 left-0'></div>
        </div>
      </Link>
    </>
  );
}
