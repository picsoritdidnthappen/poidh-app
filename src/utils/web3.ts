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
