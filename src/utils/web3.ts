import { ABI } from '@/constant';
import { chains } from '@/utils/config';
import { Netname } from '@/utils/types';

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
