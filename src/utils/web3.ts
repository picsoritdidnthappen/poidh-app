import { ABI, DEGENNAMERESABI } from '@/constant';
import { chains } from '@/utils/config';
import { mainnetPublicClient, degenPublicClient } from '@/utils/publicClients';

export async function getEnsOrDegenName({
  chainName,
  address,
}: {
  chainName: 'degen' | 'arbitrum' | 'base';
  address: string;
}) {
  if (chainName === 'arbitrum') {
    return null;
  }
  const ensName = await mainnetPublicClient.getEnsName({
    address: address as `0x${string}`,
  });

  if (ensName) {
    return ensName;
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

  return null;
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

export async function hasUserVotedOnBounty({
  chainName,
  bountyId,
  userAddress,
}: {
  chainName: 'degen' | 'arbitrum' | 'base';
  bountyId: string;
  userAddress: string;
}): Promise<boolean> {
  try {
    const chain = chains[chainName];

    // Try to simulate the voting call to see if it would throw AlreadyVoted error
    await chain.provider.simulateContract({
      abi: ABI,
      address: chain.contracts.mainContract as `0x${string}`,
      functionName: 'voteClaim',
      args: [BigInt(bountyId), true], // Vote value doesn't matter for simulation
      account: userAddress as `0x${string}`,
    });

    // If no error is thrown, user hasn't voted yet
    return false;
  } catch (error: unknown) {
    // If AlreadyVoted error is thrown, user has already voted
    const errorMessage = error instanceof Error ? error.message : String(error);
    const shortMessage = (error as { shortMessage?: string })?.shortMessage;

    if (
      errorMessage?.includes('AlreadyVoted') ||
      shortMessage?.includes('AlreadyVoted')
    ) {
      return true;
    }

    // For other errors (like insufficient funds, not a contributor, etc.),
    // we assume the user hasn't voted but can't vote for other reasons
    return false;
  }
}
