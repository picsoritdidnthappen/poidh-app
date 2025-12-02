import { Comments } from '@prisma/client';

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

export interface WarpcastCast {
  object: 'cast';
  hash: string;
  parent_hash: string | null;
  author: {
    object: 'user';
    fid: number;
    username: string;
    display_name: string;
    pfp_url: string;
    custody_address: string;
    follower_count: number;
    following_count: number;
    verified_addresses: object;
    power_badge: boolean;
  };
  text: string;
  timestamp: string;
  reactions: {
    likes_count: number;
    recasts_count: number;
    likes: any[];
    recasts: any[];
  };
  replies: {
    count: number;
  };
  direct_replies: WarpcastCast[];
}

export type BountyDisplayType = 'open' | 'progress' | 'past';

export type BountySortType = 'value' | 'date';
