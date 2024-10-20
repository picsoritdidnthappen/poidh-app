/* eslint-disable simple-import-sort/imports */
import { usePathname } from 'next/navigation';

import { chains } from '@/app/context/new/config';
import { Chain, Netname } from '@/types/new/web3';

const chainPathName = {
  degen: '/new/degen',
  base: '/new/base',
  arbitrum: '/new/arbitrum',
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
