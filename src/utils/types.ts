export type Currency = 'eth' | 'degen';

export type Netname = 'degen' | 'base' | 'arbitrum';

export type ChainId = 666666666 | 42161 | 8453;

export type Chain = {
  id: number;
  name: string;
  currency: Currency;
  slug: Netname;
  provider: ReturnType<typeof import('viem').createPublicClient>;
  contracts: {
    mainContract: string;
    nftContract: string;
  };
  explorer: string;
};

export type Wallet = {
  id: string;
  ens: string | null;
  degenName: string | null;
};

export type Claim = {
  id: string;
  title: string;
  description: string;
  url: string;
  issuer: string;
  bountyId: string;
  chainId?: ChainId;
  accepted: boolean;
};
