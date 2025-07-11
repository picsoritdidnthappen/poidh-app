import { useQuery } from '@tanstack/react-query';
import { formatWalletAddress, getEnsOrDegenName } from '@/utils/web3';
import Link from 'next/link';
import { Chain } from '@/utils/types';
import { trpc } from '@/trpc/client';
import Image from 'next/image';

export default function DisplayAddress({
  chain,
  address,
  pfpSize,
}: {
  chain: Chain;
  address: string;
  pfpSize?: number;
}) {
  const farcasterUser = trpc.farcasterUser.useQuery({ address });

  const walletDisplayName = useQuery({
    queryKey: ['getWalletDisplayName', address, chain?.slug],
    queryFn: () =>
      getWalletDisplayName({
        address: address,
        chainName: chain.slug,
      }),
  });

  return (
    <span className='inline-flex items-center whitespace-nowrap max-w-full'>
      {farcasterUser.data && farcasterUser.data[address][0].pfp_url && (
        <div
          style={{
            width: pfpSize ?? 20,
            height: pfpSize ?? 20,
            marginRight: pfpSize ? 8 : 2,
          }}
          className='flex-shrink-0 relative mr-1 overflow-hidden rounded-full'
        >
          <Image
            src={
              farcasterUser.data[address][0]?.pfp_url || '/images/avatar.png'
            }
            alt={farcasterUser.data[address][0]?.display_name}
            width={pfpSize ?? 20}
            height={pfpSize ?? 20}
            unoptimized
            className='w-full h-full object-cover'
          />
        </div>
      )}
      <Link
        href={`/${chain?.slug}/account/${address}`}
        className='hover:text-gray-200 truncate overflow-ellipsis m-0 p-0 max-w-full'
      >
        {farcasterUser.isLoading
          ? formatWalletAddress(address)
          : farcasterUser.data
          ? farcasterUser.data[address][0].username
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
  chainName: 'arbitrum' | 'base' | 'degen';
}) {
  return (await getEnsOrDegenName({ address, chainName })) || null;
}
