import { ABI, DEGENNAMERESABI } from '@/constant';
import { chains } from '@/utils/config';
import { mainnetPublicClient, degenPublicClient } from '@/utils/publicClients';

export async function getDegenOrEnsName({
  chainName,
  address,
}: {
  chainName: 'degen' | 'arbitrum' | 'base';
  address: string;
}) {
  if (chainName === 'arbitrum') {
    return null;
  }
  const degenName = await degenPublicClient.readContract({
    abi: DEGENNAMERESABI,
    address: '0x4087fb91A1fBdef05761C02714335D232a2Bf3a1',
    functionName: 'defaultNames',
    args: [address as `0x${string}`],
  });

  if (degenName) {
    return `${degenName}.degen`;
  }

  return mainnetPublicClient.getEnsName({
    address: address as `0x${string}`,
  });
}

export async function bountyCurrentVotingClaim({
  chainName,
  id,
}: {
  chainName: 'degen' | 'arbitrum' | 'base';
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
  chainName: 'degen' | 'arbitrum' | 'base';
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
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
