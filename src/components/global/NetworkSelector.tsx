import Link from 'next/link';
import React from 'react';

import { ArbitrumIcon, BaseIcon, DegenIcon } from '@/components/global/Icons';

const networks = [
  { href: '/arbitrum', Icon: ArbitrumIcon },
  { href: '/base', Icon: BaseIcon },
  { href: '/degen', Icon: DegenIcon },
];

export function NetworkSelector({
  width = 24,
  height = 24,
}: {
  width: number;
  height: number;
}) {
  return (
    <div className='flex flex-row gap-2'>
      {networks.map(({ href, Icon }) => (
        <Link
          key={href}
          href={href}
          className='border-[#D1ECFF] border rounded-full backdrop-blur-sm bg-white/30 p-2 hover:bg-white/20'
        >
          <Icon width={width} height={height} />
        </Link>
      ))}
    </div>
  );
}

export function NetworkSelectorDropDown() {}
