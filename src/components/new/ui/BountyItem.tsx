/* eslint-disable simple-import-sort/imports */
'use client';
import Link from 'next/link';
import React from 'react';
import { formatEther } from 'viem';

import { useGetChain } from '@/hooks/new/useGetChain';
import { UsersRoundIcon } from '@/components/new/global/Icons';
import { Button } from '@/components/ui';

interface Bounty {
  id: string;
  title: string;
  description: string;
  amount: string;
  network: string;
  isMultiplayer: boolean;
}

export default function BountyItem({ bounty }: { bounty: Bounty }) {
  const amount = formatEther(BigInt(bounty.amount)).toString();
  const chain = useGetChain();
  return (
    <>
      <Link href={`/new/${chain.chainPathName}/bounty/${bounty.id}`}>
        <div className='relative p-[2px] h-fit  rounded-xl'>
          <div className='p-5 flex flex-col justify-between relative z-20 h-full lg:col-span-4'>
            <div className='z-[-1] absolute w-full h-full left-0 top-0 borderBox rounded-[6px]  bg-whiteblue '></div>
            <h3 className='normal-case text-nowrap overflow-ellipsis overflow-hidden'>
              {bounty.title}
            </h3>
            <p className='my-5 normal-case max-w-fit h-28 overflow-y-scroll overflow-hidden overflow-ellipsis'>
              {bounty.description}
            </p>
            <div className='flex items-end justify-between mt-5'>
              <div className='flex gap-2 items-center'>
                <div>
                  {formatAmount(amount)}{' '}
                  {bounty.network === 'degen' ? 'degen' : 'eth'}
                </div>
                {bounty.isMultiplayer && <UsersRoundIcon />}
              </div>
              <Button>
                <Link href={`/new/${chain.chainPathName}/bounty/${bounty.id}`}>
                  see bounty
                </Link>
              </Button>
            </div>
          </div>
          <div className='z-10 bg-gradient rounded-[8px] h-full w-full absolute top-0 right-0 bottom-0 left-0'></div>
        </div>
      </Link>
    </>
  );
}

function formatAmount(amount: string): string {
  const num = parseFloat(amount);

  if (isNaN(num)) {
    return '0';
  }

  if (num < 0.001) {
    return '<0.001';
  }

  return num.toString();
}
