import { formatEther } from 'viem';
import { z } from 'zod';
import { chains } from '@/utils/config';
import { Netname } from '@/utils/types';
import { isV3Bounty } from '@/utils/utils';
import {
  buildAcceptOrNominateClaim,
  buildCreateBounty,
  buildCreateClaim,
  buildJoinOpenBounty,
  buildResolveVote,
  buildVote,
  buildWithdraw,
  parseEthAmount,
  PreparedTransaction,
  WRITE_CHAINS,
  WriteChain,
} from './transactions';

/**
 * Agent actions, shared by the MCP prepare_* tools and the /tx approval page
 * so both build the same transaction from the same checks.
 */
export type ActionRequest =
  | {
      action: 'create_bounty';
      chain: WriteChain;
      type: 'solo' | 'open';
      title: string;
      description: string;
      amountEth: string;
    }
  | { action: 'join_bounty'; chain: WriteChain; id: number; amountEth: string }
  | {
      action: 'submit_claim';
      chain: WriteChain;
      id: number;
      title: string;
      description: string;
      proofUri: string;
    }
  | { action: 'accept_claim'; chain: WriteChain; id: number; claimId: number }
  | { action: 'vote'; chain: WriteChain; id: number; approve: boolean }
  | { action: 'resolve_vote'; chain: WriteChain; id: number }
  | { action: 'withdraw'; chain: WriteChain };

export type ActionName = ActionRequest['action'];

export type BountyRecord = {
  id: number;
  onChainId: number;
  chainId: number;
  title: string;
  description: string;
  amount: string;
  issuer: string;
  inProgress: boolean;
  isCanceled: boolean;
  isMultiplayer: boolean;
  isVoting: boolean;
  hasClaims: boolean;
  amountSort?: number;
  /** Vote deadline in unix seconds while a vote is active */
  deadline?: number | null;
};

export type ClaimRecord = {
  id: number;
  bountyId: number;
  onChainId: number;
  title: string;
  description: string;
  /** Proof media URI */
  url: string;
  /** Claimant address */
  issuer: string;
};

/** Data access the actions need; MCP and the page each supply their own. */
export type ActionDeps = {
  /** Throws a user-facing error when the bounty is missing. */
  // eslint-disable-next-line no-unused-vars
  loadBounty(chain: WriteChain, id: number): Promise<BountyRecord>;
  // eslint-disable-next-line no-unused-vars
  loadClaim(chain: WriteChain, claimId: number): Promise<ClaimRecord | null>;
  /** The claim currently up for a contributor vote on a bounty. */
  // eslint-disable-next-line no-unused-vars
  loadVotingClaim(chain: WriteChain, id: number): Promise<ClaimRecord | null>;
  // eslint-disable-next-line no-unused-vars
  mustUseVoteFlow(chain: WriteChain, id: number): Promise<boolean>;
};

export type PreparedAction = {
  tx: PreparedTransaction;
  summary: string;
  /** Where to look after the transaction confirms */
  url: string;
  bounty?: BountyRecord;
  /** The claim being accepted or voted on, so a person can check it */
  claim?: ClaimRecord;
};

export const APP_URL = process.env.NEXT_PUBLIC_URL || 'https://poidh.xyz';

export const MIN_BOUNTY_WEI = 1_000_000_000_000_000n; // 0.001 ETH
export const MIN_CONTRIBUTION_WEI = 10_000_000_000_000n; // 0.00001 ETH

export function bountyStatus(b: BountyRecord) {
  if (b.isCanceled) return 'canceled';
  if (b.isVoting) return 'voting';
  if (b.inProgress) return 'open';
  return 'completed';
}

/** Seconds until a vote closes; null when the deadline is unknown. */
export function voteSecondsLeft(b: BountyRecord): number | null {
  if (!b.deadline) return null;
  return b.deadline - Math.floor(Date.now() / 1000);
}

export function slugFor(chainId: number): Netname {
  const chain = Object.values(chains).find((c) => c.id === chainId);
  if (!chain) throw new Error(`Unsupported chainId ${chainId}`);
  return chain.slug;
}

/**
 * Loads a bounty an action will write to. Bounties from before poidh v3
 * live on an older contract, and their on-chain ids repeat on the current
 * one, so a transaction for them would hit a different bounty. The site
 * hides these actions on old bounties (isV3Bounty); refuse them here too.
 */
async function loadCurrentBounty(
  deps: ActionDeps,
  chain: WriteChain,
  id: number
): Promise<BountyRecord> {
  const bounty = await deps.loadBounty(chain, id);
  if (!isV3Bounty(bounty.chainId, bounty.id)) {
    throw new Error(
      `Bounty ${id} is on poidh's older contract, so it can't be changed from here. View it at ${APP_URL}/${chain}/bounty/${id}.`
    );
  }
  return bounty;
}

function requireOpen(b: BountyRecord) {
  const status = bountyStatus(b);
  if (status !== 'open') {
    throw new Error(`Bounty ${b.id} is ${status}, not open.`);
  }
}

/**
 * Proof links are shown to people as clickable links, so only allow
 * schemes poidh can display: https, IPFS and Arweave.
 */
export function isSafeProofUri(value: string): boolean {
  try {
    return ['https:', 'ipfs:', 'ar:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function sameAddress(a?: string, b?: string) {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}

/**
 * Validates an action against current bounty state and builds its
 * transaction. `from` (the signer, when known) enables issuer checks.
 * Throws errors written for the person or agent who asked.
 */
export async function prepareAction(
  req: ActionRequest,
  deps: ActionDeps,
  from?: string
): Promise<PreparedAction> {
  const { chain } = req;
  const bountyUrl = (id: number) => `${APP_URL}/${chain}/bounty/${id}`;

  switch (req.action) {
    case 'create_bounty': {
      const amountWei = parseEthAmount(req.amountEth);
      if (amountWei < MIN_BOUNTY_WEI) {
        throw new Error('Minimum bounty reward is 0.001 ETH.');
      }
      const tx = buildCreateBounty({ ...req, amountWei });
      return {
        tx,
        summary: `Create ${
          req.type === 'open' ? 'an open' : 'a solo'
        } bounty "${req.title}" on ${chain} for ${tx.valueEth} ETH.`,
        // The new bounty's id is only known once it confirms (the /tx page
        // then links to it directly); until then the issuer's account page
        // lists it. There is no per-chain bounty list page.
        url: from ? `${APP_URL}/account/${from}` : APP_URL,
      };
    }

    case 'join_bounty': {
      const bounty = await loadCurrentBounty(deps, chain, req.id);
      requireOpen(bounty);
      if (!bounty.isMultiplayer) {
        throw new Error(
          `Bounty ${req.id} is solo; only open bounties take funds.`
        );
      }
      if (sameAddress(from, bounty.issuer)) {
        throw new Error(
          'The bounty creator cannot add funds to their own bounty.'
        );
      }
      const amountWei = parseEthAmount(req.amountEth);
      if (amountWei < MIN_CONTRIBUTION_WEI) {
        throw new Error('Minimum contribution is 0.00001 ETH.');
      }
      const tx = buildJoinOpenBounty({
        chain,
        onChainBountyId: bounty.onChainId,
        amountWei,
      });
      return {
        tx,
        summary: `Add ${tx.valueEth} ETH to bounty ${req.id} on ${chain}.`,
        url: bountyUrl(req.id),
        bounty,
      };
    }

    case 'submit_claim': {
      const bounty = await loadCurrentBounty(deps, chain, req.id);
      requireOpen(bounty);
      if (sameAddress(from, bounty.issuer)) {
        throw new Error('The bounty issuer cannot submit a claim.');
      }
      if (!isSafeProofUri(req.proofUri)) {
        throw new Error('proofUri must be an https://, ipfs:// or ar:// URL.');
      }
      const tx = buildCreateClaim({
        chain,
        onChainBountyId: bounty.onChainId,
        title: req.title,
        description: req.description,
        proofUri: req.proofUri,
      });
      return {
        tx,
        summary: `Submit a claim to bounty ${req.id} on ${chain}.`,
        url: bountyUrl(req.id),
        bounty,
      };
    }

    case 'accept_claim': {
      const bounty = await loadCurrentBounty(deps, chain, req.id);
      requireOpen(bounty);
      if (from && !sameAddress(from, bounty.issuer)) {
        throw new Error('Only the bounty issuer can accept a claim.');
      }
      const claim = await deps.loadClaim(chain, req.claimId);
      if (!claim || claim.bountyId !== req.id) {
        throw new Error(`Claim ${req.claimId} not found on bounty ${req.id}.`);
      }
      const useVote = await deps.mustUseVoteFlow(chain, req.id);
      const tx = buildAcceptOrNominateClaim({
        chain,
        onChainBountyId: bounty.onChainId,
        onChainClaimId: claim.onChainId,
        useVote,
      });
      return {
        tx,
        summary: useVote
          ? `Start a contributor vote on claim ${req.claimId} for bounty ${req.id}. Payout happens if the vote passes.`
          : `Accept claim ${req.claimId} and pay out bounty ${
              req.id
            } (${formatEther(BigInt(bounty.amount))} ETH).`,
        url: bountyUrl(req.id),
        bounty,
        claim,
      };
    }

    case 'vote': {
      const bounty = await loadCurrentBounty(deps, chain, req.id);
      if (!bounty.isVoting) {
        throw new Error(`Bounty ${req.id} has no active vote.`);
      }
      const left = voteSecondsLeft(bounty);
      if (left !== null && left <= 0) {
        throw new Error(
          `Voting on bounty ${req.id} has ended. Use prepare_resolve_vote to close it.`
        );
      }
      const claim = await deps.loadVotingClaim(chain, req.id);
      if (!claim) {
        throw new Error(
          `Could not find the claim up for vote on bounty ${req.id}.`
        );
      }
      const tx = buildVote({
        chain,
        onChainBountyId: bounty.onChainId,
        approve: req.approve,
      });
      return {
        tx,
        summary: `Vote ${req.approve ? 'yes' : 'no'} on claim ${
          claim.id
        } for bounty ${req.id}.`,
        url: bountyUrl(req.id),
        bounty,
        claim,
      };
    }

    case 'resolve_vote': {
      const bounty = await loadCurrentBounty(deps, chain, req.id);
      if (!bounty.isVoting) {
        throw new Error(`Bounty ${req.id} has no active vote.`);
      }
      const left = voteSecondsLeft(bounty);
      if (left !== null && left > 0) {
        throw new Error(
          `Voting on bounty ${req.id} is still open for about ${Math.ceil(
            left / 3600
          )} more hour(s); it can be resolved after it ends.`
        );
      }
      const claim = await deps.loadVotingClaim(chain, req.id);
      const tx = buildResolveVote({ chain, onChainBountyId: bounty.onChainId });
      return {
        tx,
        summary: `Resolve the vote on bounty ${req.id}.`,
        url: bountyUrl(req.id),
        bounty,
        claim: claim ?? undefined,
      };
    }

    case 'withdraw': {
      const tx = buildWithdraw({ chain });
      return {
        tx,
        summary: `Withdraw your poidh winnings on ${chain}.`,
        url: from ? `${APP_URL}/account/${from}` : APP_URL,
      };
    }
  }
}

/**
 * Link to the /tx approval page for an action. The page rebuilds the
 * transaction from these plain parameters and shows the human a summary,
 * so the link carries no calldata that could be swapped.
 */
export function actionUrl(req: ActionRequest): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(req)) {
    params.set(key, String(value));
  }
  return `${APP_URL}/tx?${params.toString()}`;
}

const chain = z.enum(WRITE_CHAINS);
const id = z.coerce.number().int().positive();
const text = (max: number) => z.string().trim().min(1).max(max);
const amountEth = z.string().trim().min(1);

const actionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('create_bounty'),
    chain,
    type: z.enum(['solo', 'open']).default('solo'),
    title: text(200),
    description: text(5000),
    amountEth,
  }),
  z.object({ action: z.literal('join_bounty'), chain, id, amountEth }),
  z.object({
    action: z.literal('submit_claim'),
    chain,
    id,
    title: text(200),
    description: text(5000),
    proofUri: z
      .string()
      .url()
      .refine(isSafeProofUri, 'must be an https://, ipfs:// or ar:// URL'),
  }),
  z.object({ action: z.literal('accept_claim'), chain, id, claimId: id }),
  z.object({
    action: z.literal('vote'),
    chain,
    id,
    approve: z.enum(['true', 'false']).transform((v) => v === 'true'),
  }),
  z.object({ action: z.literal('resolve_vote'), chain, id }),
  z.object({ action: z.literal('withdraw'), chain }),
]);

/** Parses /tx query parameters back into an action. */
export function parseActionParams(
  params: URLSearchParams
): { ok: true; request: ActionRequest } | { ok: false; error: string } {
  const result = actionSchema.safeParse(Object.fromEntries(params.entries()));
  if (result.success) return { ok: true, request: result.data };
  const issue = result.error.issues[0];
  if (!issue) return { ok: false, error: 'invalid link' };
  if (issue.path[0] === 'action') {
    return { ok: false, error: 'unknown action' };
  }
  return { ok: false, error: `${issue.path.join('.')}: ${issue.message}` };
}
