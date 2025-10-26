import { Configuration, NeynarAPIClient } from '@neynar/nodejs-sdk';
import env from '@/utils/serverEnv';
import { getEnsOrDegenName } from '@/utils/web3';

const neynarConfig = new Configuration({
  apiKey: env.NEYNAR_API_KEY || '',
});

export async function getCreatorDisplayName(
  address: string,
  chainSlug: string
): Promise<string> {
  try {
    const client = new NeynarAPIClient(neynarConfig);
    const users = await client.fetchBulkUsersByEthOrSolAddress({
      addresses: [address],
    });

    const farcasterUser = users?.[address.toLowerCase()]?.[0];
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
