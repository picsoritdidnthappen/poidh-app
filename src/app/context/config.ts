const chains = {
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
    jsonProviderUrl: 'https://rpc.degen.tips',
    rpc: 'https://rpc.degen.tips/E5xa24BftzZHkonuWxbngPdajGNxTyRPc',
    contracts: {
      mainContract: '0x2445BfFc6aB9EEc6C562f8D7EE325CddF1780814',
      nftContract: '0xDdfb1A53E7b73Dba09f79FCA24765C593D447a80',
    },
  },
  arbitrum: {
    name: 'Arbitrum One',
    jsonProviderUrl: 'https://arb1.arbitrum.io/rpc',
    contracts: {
      nftContract: '0xDdfb1A53E7b73Dba09f79FCA24765C593D447a80',
      poidhContract: '0x0Aa50ce0d724cc28f8F7aF4630c32377B4d5c27d',
    },
  },
  base: {
    name: 'Base Network',
    jsonProviderUrl: 'https://base.org/rpc',
    contracts: {
      nftContract: '0xDdfb1A53E7b73Dba09f79FCA24765C593D447a80',
      poidhContract: '0xb502c5856F7244DccDd0264A541Cc25675353D39',
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
    name: 'base',
    chainId: 8453,
  },
  {
    name: 'arbitrum',
    chainId: 42161,
  },
];

export default chains;
