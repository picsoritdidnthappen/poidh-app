import { Chain } from '@/types';

type NetworkChoices = 'sepolia' | 'degen' | 'arbitrum' | 'base';

export const chains: { [key in NetworkChoices]: Chain } = {
  sepolia: {
    name: 'Sepolia Base Testnet',
    jsonProviderUrl: 'https://sepolia.base.org',
    contracts: {
      mainContract: '0x6981e82d270BD01D026D0E3E10Ba486337c91923',
      nftContract: '0xd29F55255C784d777Aa7A09063E7D18377446fe2',
    },
  },
  degen: {
    name: 'Degen Mainnet',
    jsonProviderUrl:
      'https://rpc-degen-mainnet-1.t.conduit.xyz/8TM2tJu2NV9h6McqXqDPHCnsvCdwVgyrH',
    rpc: 'https://rpc-degen-mainnet-1.t.conduit.xyz/8TM2tJu2NV9h6McqXqDPHCnsvCdwVgyrH',
    contracts: {
      mainContract: '0x2445BfFc6aB9EEc6C562f8D7EE325CddF1780814',
      nftContract: '0xDdfb1A53E7b73Dba09f79FCA24765C593D447a80',
    },
  },
  arbitrum: {
    name: 'Arbitrum One',
    jsonProviderUrl:
      'https://arb-mainnet.g.alchemy.com/v2/jbQWCYaaoydawZPSf6DT1OUriin72mV3',
    contracts: {
      mainContract: '0x0Aa50ce0d724cc28f8F7aF4630c32377B4d5c27d',
      nftContract: '0xDdfb1A53E7b73Dba09f79FCA24765C593D447a80',
    },
  },
  base: {
    name: 'Base Network',
    jsonProviderUrl:
      'https://api.developer.coinbase.com/rpc/v1/base/q_7UksVVI6bvOgx0y6-hR123IsVxVk3-',
    contracts: {
      mainContract: '0xb502c5856F7244DccDd0264A541Cc25675353D39',
      nftContract: '0xDdfb1A53E7b73Dba09f79FCA24765C593D447a80',
    },
  },
};

export const networks = [
  {
    name: 'sepolia',
    chainId: 84532,
  },
  {
    name: 'degen',
    chainId: 666666666,
  },
  {
    name: 'arbitrum',
    chainId: 42161,
  },
  {
    name: 'base',
    chainId: 8453,
  },
];
