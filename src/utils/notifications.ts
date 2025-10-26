import { getEnsOrDegenName } from '@/utils/web3';
import { Netname } from '@/utils/types';
import { trpc } from '@/trpc/client';

export async function getAddressDisplayName(
  address: string,
  chainSlug: Netname
): Promise<string> {
  try {
    const users = await trpc.usersDataNeynar.useQuery({ addresses: [address] });

    const farcasterUser = users.data?.[address.toLowerCase()]?.[0];
    if (farcasterUser?.username) {
      return `@${farcasterUser.username}`;
    }
  } catch (error) {
    console.warn('Failed to fetch Farcaster user:', error);
  }

  try {
    const ensOrDegenName = await getEnsOrDegenName({
      chainName: chainSlug as any,
      address,
    });

    if (ensOrDegenName) {
      return ensOrDegenName;
    }
  } catch (error) {
    console.warn('Failed to fetch ENS/Degen name:', error);
  }

  return `${address.slice(0, 7)}`;
}
