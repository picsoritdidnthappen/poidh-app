import { formatWalletAddress } from '@/utils/web3';
import Link from 'next/link';
import { trpc } from '@/trpc/client';
import Image from 'next/image';

function hashString(value: string) {
  let hash = 0;

  for (let i = 0; i < value.length; i++) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }

  return Math.abs(hash);
}

function GeneratedPfp({
  seed,
  size,
}: {
  seed: string;
  size: number;
}) {
  const hash = hashString(seed.toLowerCase());

  const palette = [
    '#F45B5B',
    '#FFD166',
    '#118AB2',
    '#7B61FF',
    '#06D6A0',
    '#F4A261',
    '#1498FF',
    '#FF4FD8',
  ];

  const background =
    palette[hash % palette.length];

  const circle1 =
    palette[(hash + 2) % palette.length];

  const circle2 =
    palette[(hash + 4) % palette.length];

  const circle3 =
    palette[(hash + 6) % palette.length];

  const x1 = -20 + (hash % 20);
  const y1 = -10 + ((hash >> 3) % 25);

  const x2 = 45 + ((hash >> 5) % 20);
  const y2 = 35 + ((hash >> 7) % 20);

  const x3 = 35 + ((hash >> 9) % 25);
  const y3 = -10 + ((hash >> 11) % 20);

  return (
    <span
      aria-hidden='true'
      className='relative flex-shrink-0 overflow-hidden rounded-full'
      style={{
        width: size,
        height: size,
        marginRight: 8,
        backgroundColor: background,
      }}
    >
      <span
        className='absolute rounded-full'
        style={{
          width: '78%',
          height: '78%',
          left: `${x1}%`,
          top: `${y1}%`,
          backgroundColor: circle1,
        }}
      />

      <span
        className='absolute rounded-full'
        style={{
          width: '62%',
          height: '62%',
          left: `${x2}%`,
          top: `${y2}%`,
          backgroundColor: circle2,
        }}
      />

      <span
        className='absolute rounded-full'
        style={{
          width: '38%',
          height: '38%',
          left: `${x3}%`,
          top: `${y3}%`,
          backgroundColor: circle3,
        }}
      />
    </span>
  );
}

export default function DisplayAddress({
  address,
  showPfpIfExists = true,
  showFallbackPfp = false,
  pfpSize = 20,
  linkToProfile = true,
}: {
  address: string;
  showPfpIfExists?: boolean;
  showFallbackPfp?: boolean;
  pfpSize?: number;
  linkToProfile?: boolean;
}) {
  const userQuery = trpc.neynar.usersData.useQuery({
    addresses: [address],
  });

  const humanReadableName =
    trpc.web3.fetchHumanReadableName.useQuery({
      address,
    });

  const user = userQuery.data?.[0];

  const displayName = userQuery.isLoading
    ? formatWalletAddress(address)
    : user?.farcasterTag
      ? user.farcasterTag
      : humanReadableName.isLoading
        ? formatWalletAddress(address)
        : humanReadableName.data
          ? humanReadableName.data
          : formatWalletAddress(address);

  return (
    <span className='inline-flex items-center whitespace-nowrap max-w-full min-w-0'>
      {showPfpIfExists &&
        (user?.pfpUrl ? (
          <span
            style={{
              width: pfpSize,
              height: pfpSize,
              marginRight: 8,
            }}
            className='flex-shrink-0 relative overflow-hidden rounded-full'
          >
            <Image
              src={user.pfpUrl}
              alt={user.farcasterTag ?? 'User'}
              width={pfpSize}
              height={pfpSize}
              unoptimized
              className='w-full h-full object-cover'
            />
          </span>
        ) : showFallbackPfp ? (
          <GeneratedPfp
            seed={address}
            size={pfpSize}
          />
        ) : null)}

      {linkToProfile ? (
        <Link
          href={`/account/${address}`}
          className='hover:text-gray-200 truncate overflow-ellipsis m-0 p-0 max-w-full'
        >
          {displayName}
        </Link>
      ) : (
        <span className='truncate overflow-ellipsis m-0 p-0 max-w-full'>
          {displayName}
        </span>
      )}
    </span>
  );
}
