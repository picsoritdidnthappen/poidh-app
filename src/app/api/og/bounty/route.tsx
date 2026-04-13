import BountyPreviewCard, {
  BountyPreviewData,
} from '@/components/og/BountyPreviewCard';
import BountyErrorCard from '@/components/og/BountyErrorCard';
import { ImageResponse, NextRequest } from 'next/server';
import { ChainId } from '@/utils/types';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const imageFormat = searchParams.get('imageFormat') as 'og' | 'preview';
    const title = searchParams.get('title');
    const amount = searchParams.get('amount');
    const chainId = searchParams.get('chainId');
    const currencyRate = searchParams.get('currencyRate');
    const participants = searchParams.get('participants');

    if (!title || !amount || !currencyRate || !chainId || !participants) {
      return new Response('Missing or invalid parameters', { status: 400 });
    }

    const bountyPreviewData = {
      title,
      amount,
      chainId: Number(chainId) as ChainId,
      currencyRate: Number(currencyRate),
      participants: participants.split(','),
    } as BountyPreviewData;
    const fontData = await loadFont();
    const farcasterParticipants = await loadFarcasterParticipants(
      bountyPreviewData.participants
    );

    return new ImageResponse(
      await BountyPreviewCard({
        bountyData: bountyPreviewData,
        farcasterParticipants,
        imageFormat,
      }),
      {
        width: imageFormat === 'og' ? 1200 : 600,
        height: imageFormat === 'og' ? 630 : 400,
        fonts: [
          {
            name: 'GeistMono',
            data: fontData,
            style: 'normal',
          },
        ],
      }
    );
  } catch (error) {
    console.error('Error generating bounty image:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    return new ImageResponse(
      (
        <BountyErrorCard
          message={`Failed to generate bounty image: ${errorMessage}`}
        />
      ),
      {
        width: 600,
        height: 400,
      }
    );
  }
}

async function loadFont(): Promise<ArrayBuffer> {
  const fontUrl = new URL(
    '../../../../../public/fonts/GeistMono-Regular.ttf',
    import.meta.url
  );
  return fetch(fontUrl).then((r) => r.arrayBuffer());
}

async function loadFarcasterParticipants(addresses: string[]) {
  try {
    const res = await fetch(
      `${
        process.env.NEXT_PUBLIC_APP_URL
      }/api/trpc/neynar.usersData?input=${encodeURIComponent(
        JSON.stringify({ json: { addresses } })
      )}`
    );
    const json = await res.json();
    const users: Array<{
      address: string;
      farcasterTag: string | null;
      pfpUrl: string | null;
    }> = json?.result?.data?.json ?? [];
    const result: {
      [address: string]: Array<{ username: string; pfp_url: string }>;
    } = {};
    for (const user of users) {
      if (user.farcasterTag) {
        result[user.address] = [
          { username: user.farcasterTag, pfp_url: user.pfpUrl ?? '' },
        ];
      }
    }
    return result;
  } catch (error) {
    return {};
  }
}
