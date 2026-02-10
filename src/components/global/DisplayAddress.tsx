import { formatWalletAddress } from '@/utils/web3';
import Link from 'next/link';
import { trpc } from '@/trpc/client';
import Image from 'next/image';

export default function DisplayAddress({
  address,
  showPfpIfExists = true,
  pfpSize = 20,
}: {
  address: string;
  showPfpIfExists?: boolean;
  pfpSize?: number;
}) {
  const userQuery = trpc.neynar.usersData.useQuery({
    addresses: [address],
  });
  const weiOrEnsOrDegenName = trpc.web3.fetchWeiOrEnsOrDegenName.useQuery({
    address,
  });

  const user = userQuery.data?.[0];

  return (
    <span className='inline-flex items-center whitespace-nowrap max-w-full'>
      {showPfpIfExists && user && user.pfpUrl && (
        <div
          style={{
            width: pfpSize,
            height: pfpSize,
            marginRight: 8,
          }}
          className='flex-shrink-0 relative mr-1 overflow-hidden rounded-full'
        >
          <Image
            src={user.pfpUrl}
            alt={user?.farcasterTag ?? 'User'}
            width={pfpSize}
            height={pfpSize}
            unoptimized
            className='w-full h-full object-cover'
          />
        </div>
      )}
      <Link
        href={`/account/${address}`}
        className='hover:text-gray-200 truncate overflow-ellipsis m-0 p-0 max-w-full'
      >
        {userQuery.isLoading
          ? formatWalletAddress(address)
          : user?.farcasterTag
          ? user.farcasterTag
          : weiOrEnsOrDegenName.isLoading
          ? formatWalletAddress(address)
          : weiOrEnsOrDegenName.data
          ? weiOrEnsOrDegenName.data
          : formatWalletAddress(address)}
      </Link>
    </span>
  );
}
