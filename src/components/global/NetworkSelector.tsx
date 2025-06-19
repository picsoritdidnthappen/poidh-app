import Link from 'next/link';
import React from 'react';

import { ArbitrumIcon, BaseIcon, DegenIcon } from '@/components/global/Icons';

const networks = [
  { href: '/arbitrum', Icon: ArbitrumIcon, label: 'arbitrum bounties' },
  { href: '/base', Icon: BaseIcon, label: 'base bounties' },
  { href: '/degen', Icon: DegenIcon, label: 'degen bounties' },
];

export function NetworkSelector({
  width = 24,
  height = 24,
}: {
  width?: number;
  height?: number;
}) {
  return (
    <div className='flex flex-col md:flex-row gap-6 items-center'>
      {networks.map(({ href, Icon, label }) => (
        <Link
          key={href}
          href={href}
          className='flex flex-col items-center group'
        >
          <span className='border-[#D1ECFF] border rounded-full backdrop-blur-sm bg-white/30 p-3 hover:bg-white/20 transition-colors'>
            <Icon width={width} height={height} />
          </span>
          <h3 className='font-mono text-xl md:text-lg mt-3 underline group-hover:no-underline'>
            {label}
          </h3>
        </Link>
      ))}
    </div>
  );
}
