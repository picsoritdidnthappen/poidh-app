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
    const farcasterParticipantsResponse = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${encodeURIComponent(
        addresses.join(',')
      )}`,
      {
        headers: {
          'x-api-key': process.env.NEYNAR_API_KEY || '',
          'Content-Type': 'application/json',
        },
      }
    );
    const farcasterParticipants = await farcasterParticipantsResponse.json();
    return farcasterParticipants;
  } catch (error) {
    return {};
  }
}
