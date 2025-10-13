import { NextRequest } from 'next/server';
import sendBountyPushNotifications from '@/utils/notifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bountyId, chainSlug, bountyTitle, bountyUsd, creatorAddress } =
      body;
    if (
      !bountyId ||
      !chainSlug ||
      !bountyTitle ||
      !bountyUsd ||
      !creatorAddress
    ) {
      return new Response('missing fields', { status: 400 });
    }

    const result = await sendBountyPushNotifications({
      bountyId,
      chainSlug,
      bountyTitle,
      bountyUsd,
      creatorAddress,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    console.error('notifications send error', e);
    return new Response('server error', { status: 500 });
  }
}
