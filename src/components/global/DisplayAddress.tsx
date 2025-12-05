import { useQuery } from '@tanstack/react-query';
import { formatWalletAddress, getEnsOrDegenName } from '@/utils/web3';
import Link from 'next/link';
import { Netname } from '@/utils/types';
import { trpc } from '@/trpc/client';
import Image from 'next/image';

export default function DisplayAddress({
  address,
  chainName = 'base',
  showPfpIfExists = true,
  pfpSize = 20,
}: {
  address: string;
  chainName?: Netname;
  showPfpIfExists?: boolean;
  pfpSize?: number;
}) {
  const userQuery = trpc.neynar.usersData.useQuery({
    addresses: [address],
  });

  const walletDisplayName = useQuery({
    queryKey: ['getWalletDisplayName', address, chainName],
    queryFn: () =>
      getWalletDisplayName({
        address,
        chainName,
      }),
  });

  const user = userQuery.data?.[0];

  return (
    <span className='inline-flex items-center whitespace-nowrap max-w-full'>
      {showPfpIfExists && user && user.pfp_url && (
        <div
          style={{
            width: pfpSize,
            height: pfpSize,
            marginRight: 8,
          }}
          className='flex-shrink-0 relative mr-1 overflow-hidden rounded-full'
        >
          <Image
            src={user.pfp_url}
            alt={user?.farcaster_tag ?? 'User'}
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
          : user && Object.keys(user).length > 0
          ? user.farcaster_tag
          : walletDisplayName.isLoading
          ? formatWalletAddress(address)
          : walletDisplayName.data
          ? walletDisplayName.data
          : formatWalletAddress(address)}
      </Link>
    </span>
  );
}

export async function getWalletDisplayName({
  address,
  chainName,
}: {
  address: string;
  chainName: Netname;
}) {
  return (await getEnsOrDegenName({ address, chainName })) || null;
}
