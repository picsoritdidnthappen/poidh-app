import { formatWalletAddress } from '@/utils/web3';
import Link from 'next/link';
import { trpc } from '@/trpc/client';
import Image from 'next/image';
import PatternAvatar from '@/components/global/PatternAvatar';

export default function DisplayAddress({
  address,
  showPfpIfExists = true,
  showFallbackPfp = false,
  showLoadingSkeleton = false,
  pfpSize = 20,
  linkToProfile = true,
}: {
  address: string;
  showPfpIfExists?: boolean;
  showFallbackPfp?: boolean;
  showLoadingSkeleton?: boolean;
  pfpSize?: number;
  linkToProfile?: boolean;
}) {
  const userQuery = trpc.neynar.usersData.useQuery({
    addresses: [address],
  });

  const humanReadableName = trpc.web3.fetchHumanReadableName.useQuery({
    address,
  });

  const user = userQuery.data?.[0];

  /*
   * We cannot know which identity to display until:
   *
   * 1. Farcaster data has loaded, and
   * 2. if there is no Farcaster username, the human-readable
   *    wallet name lookup has also finished.
   *
   * Showing a skeleton here prevents the UI from briefly flashing
   * an abbreviated 0x address before the real name is available.
   */
  const identityIsLoading =
    userQuery.isLoading ||
    (!user?.farcasterTag && humanReadableName.isLoading);

  const displayName = user?.farcasterTag
    ? user.farcasterTag
    : humanReadableName.data
      ? humanReadableName.data
      : formatWalletAddress(address);

  if (showLoadingSkeleton && identityIsLoading) {
    return (
      <span
        className='inline-flex items-center whitespace-nowrap max-w-full min-w-0'
        aria-label='loading creator identity'
      >
        {showPfpIfExists && (
          <span
            aria-hidden='true'
            className='flex-shrink-0 rounded-full bg-white/20 animate-pulse'
            style={{
              width: pfpSize,
              height: pfpSize,
              marginRight: 8,
            }}
          />
        )}

        <span
          aria-hidden='true'
          className='h-4 w-24 max-w-[45vw] rounded bg-white/20 animate-pulse'
        />
      </span>
    );
  }

  const identity = (
    <>
      {showPfpIfExists &&
        (user?.pfpUrl ? (
          <div
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
          </div>
        ) : showFallbackPfp ? (
          <PatternAvatar
            seed={address}
            size={pfpSize}
            marginRight='8px'
          />
        ) : null)}

      <span className='truncate overflow-ellipsis m-0 p-0 max-w-full'>
        {displayName}
      </span>
    </>
  );

  if (!linkToProfile) {
    return (
      <span className='inline-flex items-center whitespace-nowrap max-w-full min-w-0'>
        {identity}
      </span>
    );
  }

  return (
    <Link
      href={`/account/${address}`}
      className='inline-flex items-center whitespace-nowrap max-w-full min-w-0 hover:text-gray-200'
    >
      {identity}
    </Link>
  );
}
