import { ABI } from '@/constant';
import { chains, getChainById } from '@/utils/config';
import { ChainId, Netname } from '@/utils/types';

/**
 * Reads the contract flag that decides whether a bounty can still be paid with a direct
 * `acceptClaim`, or has to go through the vote flow. `true` means the vote flow.
 *
 * The gate on chain is the sticky `everHadExternalContributor` flag, not the number of
 * contributors the bounty has right now: `withdrawFromOpenBounty` zeroes the contributor's
 * slot and never clears the flag. So an open bounty whose only outside contributor has left
 * looks solo from the indexed participation rows, but `acceptClaim` still reverts with
 * `NotSoloBounty()` and the issuer has to go through `submitClaimForVote`.
 *
 * All four configured chains run this contract and expose the flag, so the only reason this
 * returns `null` is that the read itself failed (RPC down, rate limited, wrong chain id).
 * Callers fall back to the indexed count in that case.
 */
export async function everHadExternalContributor({
  chainId,
  onChainId,
}: {
  chainId: ChainId;
  onChainId: number;
}): Promise<boolean | null> {
  try {
    const chain = getChainById({ chainId });

    return await chain.provider.readContract({
      abi: ABI,
      address: chain.contracts.mainContract as `0x${string}`,
      functionName: 'everHadExternalContributor',
      args: [BigInt(onChainId)],
    });
  } catch {
    return null;
  }
}

export async function bountyCurrentVotingClaim({
  chainName,
  id,
}: {
  chainName: Netname;
  id: string;
}) {
  const chain = chains[chainName];
  const currentVotingClaim = await chain.provider.readContract({
    abi: ABI,
    address: chain.contracts.mainContract as `0x${string}`,
    functionName: 'bountyCurrentVotingClaim',
    args: [BigInt(id)],
  });

  return Number(currentVotingClaim.toString());
}

export async function bountyVotingTracker({
  chainName,
  id,
}: {
  chainName: Netname;
  id: string;
}) {
  const chain = chains[chainName];
  const [yes, no, deadline] = await chain.provider.readContract({
    abi: ABI,
    address: chain.contracts.mainContract as `0x${string}`,
    functionName: 'bountyVotingTracker',
    args: [BigInt(id)],
  });

  return {
    yes: yes.toString(),
    no: no.toString(),
    deadline: deadline.toString(),
  };
}

export function calcId({
  id,
  chainId,
}: {
  id: bigint;
  chainId: bigint | number;
}) {
  return (BigInt(chainId) * BigInt(100_000) + id).toString();
}

export function formatWalletAddress(address: string): string {
  return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '';
}

export async function resolveHumanReadableNames(
  addresses: string[]
): Promise<{ [address: string]: string }> {
  const results: { [address: string]: string } = {};
  const resolved = await Promise.allSettled(
    addresses.map(async (addr) => {
      const res = await fetch(
        `${
          process.env.NEXT_PUBLIC_APP_URL
        }/api/trpc/web3.fetchHumanReadableName?input=${encodeURIComponent(
          JSON.stringify({ json: { address: addr } })
        )}`
      );
      const json = await res.json();
      const name = json?.result?.data?.json as string | null;
      return { addr, name };
    })
  );
  for (const result of resolved) {
    if (result.status === 'fulfilled' && result.value.name) {
      results[result.value.addr] = result.value.name;
    }
  }
  return results;
}
