'use client';

import Image from 'next/image';

import { trpc } from '@/trpc/client';
import PatternAvatar from '@/components/global/PatternAvatar';

export function hashString(value: string) {
  let hash = 0;

  for (let i = 0; i < value.length; i++) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }

  return Math.abs(hash);
}

export function GenerativePlaceholder({ seed }: { seed: string }) {
  const hash = hashString(seed);

  const palette = [
    '#F45B5B',
    '#FFD166',
    '#118AB2',
    '#7B61FF',
    '#06D6A0',
    '#F4A261',
  ];

  const background = palette[hash % palette.length];
  const accent1 = palette[(hash + 2) % palette.length];
  const accent2 = palette[(hash + 4) % palette.length];

  const vertical = 28 + ((hash >> 2) % 38);
  const horizontal = 30 + ((hash >> 4) % 36);

  const smallBlockLeft = 8 + ((hash >> 6) % 58);
  const smallBlockTop = 8 + ((hash >> 8) % 58);

  return (
    <div
      className='absolute inset-0 overflow-hidden'
      style={{
        backgroundColor: background,
      }}
    >
      <div
        className='absolute top-0 bottom-0 w-[4px] bg-[#102A43]'
        style={{
          left: `${vertical}%`,
        }}
      />

      <div
        className='absolute left-0 right-0 h-[4px] bg-[#102A43]'
        style={{
          top: `${horizontal}%`,
        }}
      />

      <div
        className='absolute'
        style={{
          left: `${vertical}%`,
          top: 0,
          right: 0,
          height: `${horizontal}%`,
          backgroundColor: accent1,
        }}
      />

      <div
        className='absolute border-[4px] border-[#102A43]'
        style={{
          left: `${smallBlockLeft}%`,
          top: `${smallBlockTop}%`,
          width: '24%',
          height: '24%',
          backgroundColor: accent2,
        }}
      />
    </div>
  );
}

export function IssuerAvatar({
  address,
  fallbackAlt,
  size = 28,
}: {
  address: string;
  fallbackAlt: string;
  size?: number;
}) {
  const userQuery = trpc.neynar.usersData.useQuery(
    {
      addresses: [address],
    },
    {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    }
  );

  const user = userQuery.data?.[0];

  if (userQuery.isLoading) {
    return (
      <div
        className='rounded-full bg-white/20 animate-pulse'
        style={{
          width: size,
          height: size,
        }}
      />
    );
  }

  if (user?.pfpUrl) {
    return (
      <div
        className='relative overflow-hidden rounded-full'
        style={{
          width: size,
          height: size,
        }}
      >
        <Image
          src={user.pfpUrl}
          alt={user.farcasterTag ?? fallbackAlt}
          fill
          unoptimized
          className='object-cover'
        />
      </div>
    );
  }

  return <PatternAvatar seed={address} size={size} />;
}
