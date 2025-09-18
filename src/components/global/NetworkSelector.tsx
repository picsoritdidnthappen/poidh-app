import Link from 'next/link';
import { ArbitrumIcon, BaseIcon, DegenIcon } from '@/components/global/Icons';

const networks = [
  { href: '/arbitrum', Icon: ArbitrumIcon, label: 'arbitrum bounties' },
  { href: '/base', Icon: BaseIcon, label: 'base bounties' },
  { href: '/degen', Icon: DegenIcon, label: 'degen bounties' },
];

export function NetworkSelector({ size = 24 }: { size?: number }) {
  return (
    <div className='flex flex-col md:flex-row gap-6 items-center md:items-start justify-center mx-auto'>
      {networks.map(({ href, Icon, label }) => (
        <Link
          key={href}
          href={href}
          className='flex flex-col items-center group md:w-36'
        >
          <span className='border-[#D1ECFF] border rounded-full backdrop-blur-sm bg-white/30 p-3 hover:bg-white/20 transition-colors'>
            <Icon size={size} />
          </span>
          <h3 className='font-mono text-lg md:text-base mt-3 underline group-hover:no-underline whitespace-nowrap'>
            {label}
          </h3>
        </Link>
      ))}
    </div>
  );
}
