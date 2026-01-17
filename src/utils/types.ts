import { AppRouter } from '@/trpc/trpc';
import { inferRouterOutputs } from '@trpc/server';

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

export type Bounty = {
  id: number;
  chainId: ChainId;
  title: string;
  description: string;
  amount: string;
  isMultiplayer: boolean;
  isCanceled: boolean;
  inProgress: boolean;
  hasClaims: boolean;
  amountSort: number;
  issuer: string;
  hasParticipants: boolean;
};

export type Claim = {
  id: number;
  title: string;
  description: string;
  url: string | null;
  issuer: string;
  bountyId: number;
  chainId: ChainId;
  isAccepted: boolean;
};

export type BountyDisplayType = 'open' | 'progress' | 'past';

export type BountySortType = 'value' | 'date';

export type UserData =
  | inferRouterOutputs<AppRouter>['users']['fetchByAddress']
  | undefined;
