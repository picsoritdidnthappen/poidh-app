

const chains = {
  sepolia: {
    name: "Sepolia Base Testnet",
    jsonProviderUrl: "https://sepolia.base.org",
    contracts: {
      mainContract: "0x6981e82d270BD01D026D0E3E10Ba486337c91923",
      nftContract: "0xd29F55255C784d777Aa7A09063E7D18377446fe2",
    },
  },
  degen: {
    name: "Degen Base Testnet",
    jsonProviderUrl: "https://rpc.degen.tips",
    contracts: {
      mainContract: "0x0Aa50ce0d724cc28f8F7aF4630c32377B4d5c27d",
      nftContract: "0xDdfb1A53E7b73Dba09f79FCA24765C593D447a80",
    },
  },
};



export default chains;
