import { usePathname } from 'next/navigation';
import { Chain, Netname } from '@/utils/types';
import { chains } from '@/utils/config';

const chainPathName = {
  degen: '/degen',
  base: '/base',
  arbitrum: '/arbitrum',
};

const chainIds = {
  degen: '666666666', // Replace with actual Degen chain ID
  base: '8453',
  arbitrum: '42161',
};

export const useGetChain = (): Chain => {
  const pathname = usePathname();

  // If no chainId match or chainId not provided, look up by path
  for (const [key, value] of Object.entries(chainPathName)) {
    if (pathname.startsWith(value)) {
      return chains[key as Netname];
    }
  }

  // Default fallback
  return chains['base'];
};
