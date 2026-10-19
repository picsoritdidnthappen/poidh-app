import {
  BaseError,
  decodeErrorResult,
  decodeEventLog,
  encodeFunctionData,
  formatEther,
  Log,
  parseEther,
  toHex,
} from 'viem';
import abi from '@/constant/abi/abi';
import { chains } from '@/utils/config';

/**
 * Chains agents may write to. Degen Chain is retired (see SKILL.md), so it is
 * readable through the MCP tools but never offered as a write target.
 */
export const WRITE_CHAINS = ['mainnet', 'arbitrum', 'base'] as const;

export type WriteChain = (typeof WRITE_CHAINS)[number];

/**
 * An unsigned transaction an agent hands to a wallet. Field names follow
 * `eth_sendTransaction` / EIP-5792 `wallet_sendCalls` so the object can be
 * passed through unchanged. `value` is hex wei, with decimal copies for
 * humans and tools that prefer them.
 */
export type PreparedTransaction = {
  chainId: number;
  to: `0x${string}`;
  data: `0x${string}`;
  value: `0x${string}`;
  valueWei: string;
  valueEth: string;
  functionName: string;
};

type Args = {
  chain: WriteChain;
  functionName: string;
  data: `0x${string}`;
  valueWei?: bigint;
};

function build({ chain, functionName, data, valueWei = 0n }: Args) {
  const target = chains[chain];
  const tx: PreparedTransaction = {
    chainId: target.id,
    to: target.contracts.mainContract as `0x${string}`,
    data,
    value: toHex(valueWei),
    valueWei: valueWei.toString(),
    valueEth: formatEther(valueWei),
    functionName,
  };
  return tx;
}

/**
 * The same call as EIP-5792 `wallet_sendCalls` params. `from` is included
 * when known; without it, wallets fill in the connected account.
 */
export function toSendCalls(tx: PreparedTransaction, from?: `0x${string}`) {
  return {
    version: '2.0.0',
    chainId: toHex(tx.chainId),
    ...(from ? { from } : {}),
    atomicRequired: false,
    calls: [{ to: tx.to, data: tx.data, value: tx.value }],
  };
}

/**
 * Human-readable hints for contract errors an agent is likely to hit, keyed
 * by the PoidhV3 custom error name.
 */
const REVERT_HINTS: Record<string, string> = {
  ContractsCannotCreateBounties:
    'Bounties must be created from a regular wallet (EOA). Smart-contract wallets, including poidh "Create wallet" accounts, cannot create bounties.',
  IssuerCannotClaim: 'The bounty issuer cannot submit a claim.',
  InsufficientBalance: 'The sender does not have enough ETH.',
  NothingToWithdraw: 'There are no winnings to withdraw on this chain.',
  NotActiveParticipant: 'Only contributors to this open bounty can vote.',
  AlreadyVoted: 'This wallet already voted.',
  BountyClaimed: 'This bounty has already been paid out.',
  BountyClosed: 'This bounty is closed.',
};

export type SenderKind = 'eoa' | 'eip7702' | 'contract' | 'unknown';

/**
 * Classifies a sender by its bytecode. Needed because `eth_call` sets
 * tx.origin to `from`, so simulation alone cannot catch PoidhV3's
 * `msg.sender == tx.origin` rule on bounty creation: a 4337 smart account
 * passes the dry run but reverts when a bundler submits it.
 * EIP-7702 accounts carry a 23-byte `0xef0100…` delegation designator and
 * pass the rule only when they send the transaction themselves.
 * Best effort: a counterfactual (not yet deployed) smart account also has
 * empty code and is reported as 'eoa'.
 */
export async function getSenderKind(
  chain: WriteChain,
  from: `0x${string}`
): Promise<SenderKind> {
  try {
    const code = await chains[chain].provider.getCode({ address: from });
    if (!code || code === '0x') return 'eoa';
    if (code.toLowerCase().startsWith('0xef0100')) return 'eip7702';
    return 'contract';
  } catch {
    return 'unknown';
  }
}

export type Simulation =
  | { ok: true; from: `0x${string}` }
  | { ok: false; from: `0x${string}`; error: string; hint?: string };

/**
 * Dry-runs a prepared transaction from `from` with `eth_call`, decoding
 * PoidhV3 custom errors. Returns null if the RPC itself fails, so a flaky
 * node never blocks preparing a transaction.
 */
export async function simulate(
  chain: WriteChain,
  tx: PreparedTransaction,
  from: `0x${string}`
): Promise<Simulation | null> {
  try {
    await chains[chain].provider.call({
      account: from,
      to: tx.to,
      data: tx.data,
      value: BigInt(tx.valueWei),
    });
    return { ok: true, from };
  } catch (err) {
    const revertData =
      err instanceof BaseError
        ? (err.walk(
            (e) =>
              typeof (e as { data?: unknown }).data === 'string' &&
              ((e as { data: string }).data as string).startsWith('0x')
          ) as { data?: `0x${string}` } | null)
        : null;
    if (!revertData?.data) {
      // geth-style nodes say "insufficient funds"; reth (Base) says "OutOfFunds"
      const message =
        err instanceof BaseError ? `${err.shortMessage} ${err.details}` : '';
      if (/insufficient funds|out ?of ?funds/i.test(message)) {
        return {
          ok: false,
          from,
          error: 'InsufficientFunds',
          hint: REVERT_HINTS.InsufficientBalance,
        };
      }
      return null;
    }
    try {
      const { errorName } = decodeErrorResult({ abi, data: revertData.data });
      return {
        ok: false,
        from,
        error: errorName,
        hint: REVERT_HINTS[errorName],
      };
    } catch {
      return { ok: false, from, error: 'Reverted' };
    }
  }
}

/**
 * Reads the onchain id of the bounty a confirmed create transaction made.
 * Only logs emitted by `contract` (the poidh contract the transaction was
 * sent to) count, so a look-alike event from another contract can't change
 * which bounty the person is sent to. Returns null when there is none.
 */
export function createdBountyOnChainId(
  logs: readonly Pick<Log, 'address' | 'data' | 'topics'>[],
  contract: `0x${string}`
): bigint | null {
  for (const log of logs) {
    if (log.address.toLowerCase() !== contract.toLowerCase()) continue;
    try {
      const event = decodeEventLog({
        abi,
        data: log.data,
        topics: log.topics,
      });
      if (event.eventName === 'BountyCreated') return event.args.id;
    } catch {
      // Another poidh event this ABI doesn't describe; keep looking.
    }
  }
  return null;
}

/**
 * Parses a user-supplied ETH amount ("0.01") into wei, rejecting malformed,
 * zero and negative values with messages an agent can act on.
 */
export function parseEthAmount(amount: string): bigint {
  const trimmed = amount.trim();
  if (!/^\d+(\.\d{1,18})?$/.test(trimmed)) {
    throw new Error(
      `Invalid ETH amount "${amount}". Use a decimal string like "0.01".`
    );
  }
  const wei = parseEther(trimmed);
  if (wei <= 0n) {
    throw new Error('Amount must be greater than 0.');
  }
  return wei;
}

export function buildCreateBounty(input: {
  chain: WriteChain;
  type: 'solo' | 'open';
  title: string;
  description: string;
  amountWei: bigint;
}): PreparedTransaction {
  const functionName =
    input.type === 'open' ? 'createOpenBounty' : 'createSoloBounty';
  return build({
    chain: input.chain,
    functionName,
    valueWei: input.amountWei,
    data: encodeFunctionData({
      abi,
      functionName,
      args: [input.title, input.description],
    }),
  });
}

export function buildJoinOpenBounty(input: {
  chain: WriteChain;
  onChainBountyId: number;
  amountWei: bigint;
}): PreparedTransaction {
  return build({
    chain: input.chain,
    functionName: 'joinOpenBounty',
    valueWei: input.amountWei,
    data: encodeFunctionData({
      abi,
      functionName: 'joinOpenBounty',
      args: [BigInt(input.onChainBountyId)],
    }),
  });
}

export function buildCreateClaim(input: {
  chain: WriteChain;
  onChainBountyId: number;
  title: string;
  description: string;
  proofUri: string;
}): PreparedTransaction {
  return build({
    chain: input.chain,
    functionName: 'createClaim',
    data: encodeFunctionData({
      abi,
      functionName: 'createClaim',
      args: [
        BigInt(input.onChainBountyId),
        input.title,
        input.description,
        input.proofUri,
      ],
    }),
  });
}

/**
 * Accepting a claim is a direct payout on solo bounties (and open bounties
 * that never had an outside contributor); otherwise the claim must go to a
 * contributor vote. The caller decides which via `mustUseVoteFlow`.
 */
export function buildAcceptOrNominateClaim(input: {
  chain: WriteChain;
  onChainBountyId: number;
  onChainClaimId: number;
  useVote: boolean;
}): PreparedTransaction {
  const functionName = input.useVote ? 'submitClaimForVote' : 'acceptClaim';
  return build({
    chain: input.chain,
    functionName,
    data: encodeFunctionData({
      abi,
      functionName,
      args: [BigInt(input.onChainBountyId), BigInt(input.onChainClaimId)],
    }),
  });
}

export function buildVote(input: {
  chain: WriteChain;
  onChainBountyId: number;
  approve: boolean;
}): PreparedTransaction {
  return build({
    chain: input.chain,
    functionName: 'voteClaim',
    data: encodeFunctionData({
      abi,
      functionName: 'voteClaim',
      args: [BigInt(input.onChainBountyId), input.approve],
    }),
  });
}

export function buildResolveVote(input: {
  chain: WriteChain;
  onChainBountyId: number;
}): PreparedTransaction {
  return build({
    chain: input.chain,
    functionName: 'resolveVote',
    data: encodeFunctionData({
      abi,
      functionName: 'resolveVote',
      args: [BigInt(input.onChainBountyId)],
    }),
  });
}

export function buildWithdraw(input: {
  chain: WriteChain;
}): PreparedTransaction {
  return build({
    chain: input.chain,
    functionName: 'withdraw',
    data: encodeFunctionData({ abi, functionName: 'withdraw', args: [] }),
  });
}
