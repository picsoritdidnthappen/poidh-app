import Link from 'next/link';
import React from 'react';

import {
  ArbitrumIcon,
  BaseIcon,
  DegenIcon,
} from '@/components/new/global/Icons';

export default function NetworkSelector() {
  return (
    <>
      <div className='px-5  lg:px-20 flex flex-col justify-center items-center'>
        <div className='flex mt-5 flex-row gap-2'>
          <Link
            href='/new/arbitrum'
            className='flex justify-center items-center border-[#D1ECFF] border rounded-full backdrop-blur-sm  hover:bg-white/50 bg-white/30 w-[100px] h-[100px]'
          >
            <ArbitrumIcon width={70} height={70} />
          </Link>
          <Link
            href='/new/base'
            className='flex justify-center items-center border-[#D1ECFF] border rounded-full backdrop-blur-sm  hover:bg-white/50 bg-white/30 w-[100px] h-[100px]'
          >
            <BaseIcon width={70} height={70} />
          </Link>
          <Link
            href='/new/degen'
            className='flex justify-center items-center border-[#D1ECFF] border rounded-full backdrop-blur-sm  hover:bg-white/50 bg-white/30 w-[100px] h-[100px]'
          >
            <DegenIcon width={70} height={70} />
          </Link>
        </div>
      </div>
    </>
  );
}
