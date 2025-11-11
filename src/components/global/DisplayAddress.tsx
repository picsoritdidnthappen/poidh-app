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
  pfpSize,
}: {
  address: string;
  chainName?: Netname;
  showPfpIfExists?: boolean;
  pfpSize?: number;
}) {
  const userDataNeynar = trpc.usersDataNeynar.useQuery({
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

  return (
    <span className='inline-flex items-center whitespace-nowrap max-w-full'>
      {showPfpIfExists && userDataNeynar?.data && userDataNeynar?.data[address]?.[0]?.pfp_url && (
        <div
          style={{
            width: pfpSize ?? 20,
            height: pfpSize ?? 20,
            marginRight: pfpSize ? 8 : 7,
          }}
          className='flex-shrink-0 relative mr-1 overflow-hidden rounded-full'
        >
          <Image
            src={userDataNeynar.data[address][0].pfp_url}
            alt={userDataNeynar.data[address][0]?.display_name ?? 'User'}
            width={pfpSize ?? 20}
            height={pfpSize ?? 20}
            unoptimized
            className='w-full h-full object-cover'
          />
        </div>
      )}
      <Link
        href={`/account/${address}`}
        className='hover:text-gray-200 truncate overflow-ellipsis m-0 p-0 max-w-full'
      >
        {userDataNeynar.isLoading
          ? formatWalletAddress(address)
          : userDataNeynar?.data && Object.keys(userDataNeynar?.data).length > 0
          ? userDataNeynar?.data[address]?.[0]?.username
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
