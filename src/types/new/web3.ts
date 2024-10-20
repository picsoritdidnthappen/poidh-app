export type Currency = 'eth' | 'degen';

export type Netname = 'degen' | 'base' | 'arbitrum';

export type Chain = {
  id: number;
  name: string;
  currency: Currency;
  chainPathName: string;
  jsonProviderUrl: string;
  contracts: {
    mainContract: string;
    nftContract: string;
  };
};

export type Wallet = {
  id: string;
  ens: string | null;
  degenName: string | null;
};
