import { Chain, Netname } from '@/types/new/web3';

export const chains: { [key in Netname]: Chain } = {
  degen: {
    id: 666666666,
    name: 'Degen Mainnet',
    chainPathName: 'degen',
    currency: 'degen',
    jsonProviderUrl:
      'https://rpc-degen-mainnet-1.t.conduit.xyz/8TM2tJu2NV9h6McqXqDPHCnsvCdwVgyrH',
    contracts: {
      mainContract: '0x2445BfFc6aB9EEc6C562f8D7EE325CddF1780814',
      nftContract: '0xDdfb1A53E7b73Dba09f79FCA24765C593D447a80',
    },
  },
  arbitrum: {
    id: 42161,
    name: 'Arbitrum One',
    chainPathName: 'arbitrum',
    currency: 'eth',
    jsonProviderUrl:
      'https://arb-mainnet.g.alchemy.com/v2/vePHk-Vg-wjRw9LtykUKxDTxoUA2FHSh',
    contracts: {
      mainContract: '0x0Aa50ce0d724cc28f8F7aF4630c32377B4d5c27d',
      nftContract: '0xDdfb1A53E7b73Dba09f79FCA24765C593D447a80',
    },
  },
  base: {
    id: 8453,
    name: 'Base Network',
    chainPathName: 'base',
    currency: 'eth',
    jsonProviderUrl:
      'https://api.developer.coinbase.com/rpc/v1/base/q_7UksVVI6bvOgx0y6-hR123IsVxVk3-',
    contracts: {
      mainContract: '0xb502c5856F7244DccDd0264A541Cc25675353D39',
      nftContract: '0xDdfb1A53E7b73Dba09f79FCA24765C593D447a80',
    },
  },
};
