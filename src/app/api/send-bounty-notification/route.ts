import { NextRequest, NextResponse } from 'next/server';
import { NeynarAPIClient, Configuration } from '@neynar/nodejs-sdk';
import env from '@/utils/serverEnv';
import { getEnsOrDegenName } from '@/utils/web3';

const neynarConfig = new Configuration({
  apiKey: env.NEYNAR_API_KEY || '',
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bountyUsd, bountyTitle, chainSlug, bountyId, creatorAddress } =
      body;

    if (
      !bountyUsd ||
      !bountyTitle ||
      !chainSlug ||
      !bountyId ||
      !creatorAddress
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const bountyUsdNum = Number(bountyUsd);
    if (isNaN(bountyUsdNum) || bountyUsdNum < 100) {
      return new NextResponse(null, { status: 200 });
    }

    if (!env.NEYNAR_API_KEY) {
      return NextResponse.json(
        { message: 'Notification service not configured' },
        { status: 200 }
      );
    }

    const creatorName = await getCreatorDisplayName(creatorAddress, chainSlug);
    const notification = {
      title: `💰 NEW $${bountyUsdNum} BOUNTY 💰`,
      body: `${bountyTitle}${creatorName ? ` from ${creatorName}` : ''}`,
      target_url: `https://poidh.xyz/${chainSlug}/bounty/${bountyId}`,
    };

    const client = new NeynarAPIClient(neynarConfig);
    await client.publishFrameNotifications({
      notification,
      targetFids: [],
    });

    return NextResponse.json(
      { message: 'Notification sent successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to send bounty notification:', error);
    return NextResponse.json(
      {
        error: 'Failed to send notification',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function getCreatorDisplayName(
  address: string,
  chainSlug: string
): Promise<string> {
  const client = new NeynarAPIClient(neynarConfig);
  const users = await client.fetchBulkUsersByEthOrSolAddress({
    addresses: [address],
  });

  const farcasterUser = users?.[address.toLowerCase()]?.[0];
  if (farcasterUser?.username) {
    return `@${farcasterUser.username}`;
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
