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
      mainContract: '0x2445BfFc6aB9EEc6C562f8D7EE325CddF1780814',
      nftContract: '0xDdfb1A53E7b73Dba09f79FCA24765C593D447a80',
    },
  },
  arbitrum: {
    id: 42161,
    name: 'Arbitrum One',
    slug: 'arbitrum',
    currency: 'eth',
    provider: arbitrumPublicClient,
    contracts: {
      mainContract: '0x0Aa50ce0d724cc28f8F7aF4630c32377B4d5c27d',
      nftContract: '0xDdfb1A53E7b73Dba09f79FCA24765C593D447a80',
    },
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
      mainContract: '0xb502c5856F7244DccDd0264A541Cc25675353D39',
      nftContract: '0xDdfb1A53E7b73Dba09f79FCA24765C593D447a80',
    },
  },
};

export function getChainById({
  chainId,
}: {
  chainId: ChainId;
}) {
  return Object.values(chains).find((chain) => chain.id === chainId)!;
}
