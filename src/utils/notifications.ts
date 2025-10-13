import prisma from 'prisma/prisma';
import { getEnsOrDegenName } from '@/utils/web3';

export async function resolveDisplayName(address: string) {
  try {
    const user = await prisma.users.findUnique({ where: { address } });
    if (user?.farcaster) {
      return `@${user.farcaster}`;
    }
  } catch (e) {
    console.error('resolveDisplayName prisma error', e);
  }

  try {
    const name = await getEnsOrDegenName({ chainName: 'degen', address });
    if (name) return name;
  } catch (e) {
    console.warn('failed to resolve ENS/degen name', e);
  }

  return address.slice(0, 8);
}

async function sendToToken(
  tokenRecord: { token: string; url: string },
  payload: any
) {
  try {
    const res = await fetch(tokenRecord.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.status === 410 || res.status === 404) {
      try {
        await prisma.notificationTokens.deleteMany({
          where: { token: tokenRecord.token },
        });
      } catch (e) {
        console.error('failed deleting token', tokenRecord.token, e);
      }
    }

    return res.ok;
  } catch (e) {
    console.error('sendToToken error', e);
    return false;
  }
}

export default async function sendBountyPushNotifications({
  bountyId,
  chainSlug,
  bountyTitle,
  bountyUsd,
  creatorAddress,
}: {
  bountyId: number | string;
  chainSlug: string;
  bountyTitle: string;
  bountyUsd: number;
  creatorAddress: string;
}) {
  if (!bountyUsd || bountyUsd <= 100) return { sent: 0 };

  const title = `💰 NEW $${Math.round(bountyUsd)} BOUNTY 💰`;
  const displayName = await resolveDisplayName(creatorAddress);
  const body = `${bountyTitle} from ${displayName}`;
  const url = `https://poidh.xyz/${chainSlug}/bounty/${bountyId}`;

  const tokens = await prisma.notificationTokens.findMany({});
  const payload = { title, body, url };

  const batchSize = 10;
  let sent = 0;
  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (t) => {
        const ok = await sendToToken({ token: t.token, url: t.url }, payload);
        if (ok) sent++;
      })
    );

    if (i + batchSize < tokens.length)
      await new Promise((r) => setTimeout(r, 200));
  }

  return { sent };
}
