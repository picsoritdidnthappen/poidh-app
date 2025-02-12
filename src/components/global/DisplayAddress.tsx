import { useQuery } from '@tanstack/react-query';
import { formatWalletAddress, getDegenOrEnsName } from '@/utils/web3';
import Link from 'next/link';
import { Chain } from '@/utils/types';

export default function DisplayAddress({
  chain,
  address,
}: {
  chain: Chain;
  address: string;
}) {
  const walletDisplayName = useQuery({
    queryKey: ['getWalletDisplayName', address, chain?.slug],
    queryFn: () =>
      getWalletDisplayName({
        address: address,
        chainName: chain.slug,
      }),
  });

  return (
    <Link
      href={`/${chain?.slug}/account/${address}`}
      className='hover:text-gray-200 block truncate overflow-ellipsis m-0 p-0'
    >
      {walletDisplayName.isLoading
        ? formatWalletAddress(address)
        : walletDisplayName.data || formatWalletAddress(address)}
    </Link>
  );
}

export async function getWalletDisplayName({
  address,
  chainName,
}: {
  address: string;
  chainName: 'arbitrum' | 'base' | 'degen';
}) {
  return (await getDegenOrEnsName({ address, chainName })) || null;
}
