import { usePathname } from 'next/navigation';

import { Chain, Netname } from '@/utils/types';
import { chains } from '@/utils/config';

const chainPathName = {
  degen: '/degen',
  base: '/base',
  arbitrum: '/arbitrum',
};

export const useGetChain = (): Chain => {
  const pathname = usePathname();

  for (const [key, value] of Object.entries(chainPathName)) {
    if (pathname.startsWith(value)) {
      return chains[key as Netname];
    }
  }

  return chains['base'];
};
