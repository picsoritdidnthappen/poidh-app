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
      mainContract: '0x0285626130C127741C18C7730625ca624B727DC3',
      nftContract: '0xc43e1ab1f0e9daf37Ba532D06A9Fc713AA999A96',
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
      mainContract: '0xF3872201171A0fF0a6e789627583E8036C41Baec',
      nftContract: '0x18E5585ca7cE31b90Bc8BB7aAf84152857cE243f',
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
      mainContract: '0xF3872201171A0fF0a6e789627583E8036C41Baec',
      nftContract: '0x18E5585ca7cE31b90Bc8BB7aAf84152857cE243f',
    },
    explorer: 'https://basescan.org/tx/',
  },
};

export function getChainById({ chainId }: { chainId: ChainId }) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return Object.values(chains).find((chain) => chain.id === chainId)!;
}
