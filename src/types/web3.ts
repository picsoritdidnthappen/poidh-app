/* eslint-disable @typescript-eslint/no-explicit-any */
import { Contract } from 'ethers';
import { Abi, Address } from 'viem';

// Wallets and Signers
export interface Wallet {
  address: string;
  authenticated: boolean;
  chain: string;
  connected: boolean;
  id: string;
}

// Chains & Chain Contract Info
export type Chain = {
  name: string;
  jsonProviderUrl: string;
  rpc?: string;
  contracts: {
    mainContract: string;
    nftContract: string;
  };
};

// Contract Data Types
export type MainContractType = Contract;
// export type NFTContractType = Contract;

// Bounties and Claims
export interface Bounty {
  id: string;
  issuer: string;
  issuerDegenOrEnsName?: string | null;
  name: string;
  description: string;
  amount: string | bigint | number;
  claimer: string;
  createdAt: bigint;
  claimId: string;
  isMultiplayer: boolean;
  inProgress: boolean;
}

export interface BountiesData {
  id: string;
  issuer: string;
  name: string;
  amount: string | bigint | number;
  description: string;
  claimer: string;
  createdAt: bigint;
  claimId: string;
  isMultiplayer: boolean;
  inProgress: boolean;
}

export interface BountiesDataClosed {
  id: string;
  issuer: string;
  name: string;
  description: string;
  claimer: string;
  createdAt: bigint;
  claimId: string;
}

export interface BountiesDataOpen {
  id: string;
  issuer: string;
  name: string;
  description: string;
  claimer: string;
  createdAt: bigint;
  claimId: string;
}

export interface ClaimsData {
  accepted: boolean;
  bountyId: string;
  bountyIssuer: string;
  createdAt: bigint;
  description: string;
  id: string;
  issuer: string;
  name: string;
}

export interface BountyListProps {
  bountiesData: BountiesData[];
}

type Amount = string;

export interface OpenBounty {
  addresses: Address[];
  amounts: Amount[];
  degenOrEnsNames?: (string | null)[];
}

export interface Claim {
  id: string;
  issuer: string;
  bountyId: string;
  bountyIssuer: string;
  name: string;
  description: string;
  createdAt: bigint;
  accepted: boolean;
}

export interface VotingTracker {
  yes: string;
  no: string;
  deadline: string;
}

// export interface URI {
//   description: any;
//   external_url: string;
//   image: any;
//   name: any;
//   attributes: never[];
// }

export interface NFTDetails {
  uri: string;
  name: string;
  description: string;
  nftId: string;
}

export interface TokenIds {
  nftId: string;
}

export interface blackListClaims {
  bountyId: number;
  claims: number[];
}

export type MultiCallInput = {
  address: Address;
  abi: Abi;
  functionName: string;
  args: any[];
};

// Contract Interaction Functions
export type CreateBountyFunction = (
  primaryWallet: Wallet,
  name: string,
  description: string,
  value: string
) => Promise<any>;
export type CreateClaimFunction = (
  primaryWallet: Wallet,
  name: string,
  uri: string,
  description: string,
  bountyId: string
) => Promise<void>;
export type AcceptClaimFunction = (
  primaryWallet: Wallet,
  bountyId: string,
  claimId: string
) => Promise<void>;
export type CancelBountyFunction = (
  primaryWallet: Wallet,
  id: string
) => Promise<void>;

export type withdrawFromOpenBountyFunction = (
  primaryWallet: Wallet,
  id: string
) => Promise<void>;
export type SubmitClaimForVoteFunction = (
  primaryWallet: Wallet,
  bountyId: string,
  claimId: string
) => Promise<void>;

export type JoinOpenBountyFunction = (
  primaryWallet: Wallet,
  id: string,
  value: string
) => Promise<void>;

// Data Fetching Functions
export type FetchBountiesFunction = (
  offset: number,
  count?: number
) => Promise<Bounty[]>;
export type FetchBountyByIdFunction = (id: string) => Promise<Bounty>;
export type GetBountiesByUserFunction = (
  user: string,
  offset: number,
  allBounties: Bounty[]
) => Promise<Bounty[]>;
export type GetAllBountiesFunction = () => Promise<Bounty[]>;
export type GetOpenBountiesByUserFunction = (
  primaryWallet: Wallet
) => Promise<Bounty[]>;

export type GetParticipants = (id: string) => Promise<OpenBounty>;
export type BountyCurrentVotingClaimFunction = (
  id: string
) => Promise<number | null>;
export type BountyVotingTrackerFunction = (
  id: string
) => Promise<VotingTracker>;

export type VoteClaimFunction = (
  primaryWallet: Wallet,
  id: string,
  vote: boolean
) => Promise<void>;

export type ResolveVoteFunction = (
  primaryWallet: Wallet,
  bountyId: string
) => Promise<void>;

export type GetNftsOfOwnerFunction = (
  primaryWallet: Address
) => Promise<Address[]>;

export type GetClaimsByUserFunction = (user: string) => Promise<Claim[]>;
export type GetClaimsByBountyIdFunction = (id: string) => Promise<Claim[]>;
export type GetClaimsByMulticall = (ids: BountiesData[]) => Promise<any>;
export type GetClaimByIdFunction = (claimId: string) => Promise<Claim>;

export type GetURIFunction = (claimId: string) => Promise<string>;
