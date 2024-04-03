import { Contract } from "ethers";

// Wallets and Signers
interface Wallet {
  address: string;
  authenticated: boolean;
  chain: string;
  connected: boolean;
  id: string;
}


// Contract Data Types
export type MainContractType = Contract;
export type NFTContractType = Contract;

// Bounties and Claims
export interface Bounty {
  id: string;
  issuer: string;
  name: string;
  description: string;
  amount: string;
  claimer: string;
  createdAt: bigint; 
  claimId: string;
}

export interface BountiesData {
  id: string;
  issuer: string;
  name: string;
  description: string;
  claimer: string;
  createdAt: bigint; 
  claimId: string;
}


export interface BountyListProps {
  bountiesData: BountiesData[];
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


// Contract Interaction Functions
export type CreateBountyFunction = (primaryWallet: Wallet, name: string, description: string, value: string) => Promise<void>;
export type CreateClaimFunction = (primaryWallet: Wallet, name: string, uri: string, description: string, bountyId: string) => Promise<void>;
export type AcceptClaimFunction = (primaryWallet: Wallet, bountyId: string, claimId: string) => Promise<void>;
export type CancelBountyFunction = (primaryWallet: Wallet, id: string) => Promise<void>;

// Data Fetching Functions
export type FetchBountiesFunction = (offset: number) => Promise<Bounty[]>;
export type FetchBountyByIdFunction = (id: string) => Promise<Bounty>;
export type GetBountiesByUserFunction = (user: string, offset: number, allBounties: Bounty[]) => Promise<Bounty[]>;
export type GetAllBountiesFunction = () => Promise<Bounty[]>;

export type GetClaimsByUserFunction = (user: string) => Promise<Claim[]>;
export type GetClaimsByBountyIdFunction = (id: string) => Promise<Claim[]>;
export type GetURIFunction = (claimId: string) => Promise<string>;
