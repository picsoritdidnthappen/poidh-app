import {
  arbitrumPublicClient,
  basePublicClient,
  degenPublicClient,
} from '@/utils/publicClients';
import { Chain, ChainId, Netname } from '@/utils/types';

export const chains: Record<Netname, Chain> = {
  degen: {
    id: 666666666,
    name: 'Degen Mainnet',
    slug: 'degen',
    currency: 'degen',
    provider: degenPublicClient,
    contracts: {
      mainContract: '0x18e5585ca7ce31b90bc8bb7aaf84152857ce243f',
      nftContract: '0x39f04b7897dcaf9dc454e433f43fb1c3bb528e11',
    },
    explorer: 'https://explorer.degen.tips/tx/',
  },
  arbitrum: {
    id: 42161,
    name: 'Arbitrum One',
    slug: 'arbitrum',
    currency: 'eth',
    provider: arbitrumPublicClient,
    contracts: {
      mainContract: '0x5555fa783936c260f77385b4e153b9725fef1719',
      nftContract: '0x27E117Cc9A8DA363442e7Bd0618939E3EEEACF6A',
    },
    explorer: 'https://arbiscan.io/tx/',
  },
  base: {
    id: 8453,
    name: 'Base Network',
    slug: 'base',
    currency: 'eth',
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    provider: basePublicClient,
    contracts: {
      mainContract: '0x5555fa783936c260f77385b4e153b9725fef1719',
      nftContract: '0x27E117Cc9A8DA363442e7Bd0618939E3EEEACF6A',
    },
    explorer: 'https://basescan.org/tx/',
  },
};

export function getChainById({ chainId }: { chainId: ChainId }) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return Object.values(chains).find((chain) => chain.id === chainId)!;
}
