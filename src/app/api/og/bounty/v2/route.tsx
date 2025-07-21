import BountyPreviewCard, {
  BountyPreviewData,
} from '@/components/og/BountyPreviewCard';
import BountyErrorCard from '@/components/frame/claims/Error';
import { ImageResponse, NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bountyFrameDataEncoded = searchParams.get('data');
    const imageFormat = searchParams.get('imageFormat') as 'og' | 'preview';

    if (!bountyFrameDataEncoded) {
      return new ImageResponse(
        <BountyErrorCard message='Missing bounty data.' />,
        {
          width: imageFormat === 'og' ? 1200 : 600,
          height: imageFormat === 'og' ? 630 : 400,
        }
      );
    }
    const bountyFrameData = JSON.parse(
      decodeURIComponent(bountyFrameDataEncoded)
    ) as BountyPreviewData;
    const fontData = await loadFont();
    const farcasterParticipants = await loadFarcasterParticipants(
      bountyFrameData.participants
    );

    return new ImageResponse(
      (
        <BountyPreviewCard
          bountyData={bountyFrameData}
          farcasterParticipants={farcasterParticipants}
          imageFormat={imageFormat}
        />
      ),
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
    '../../../../../../public/fonts/GeistMono-Regular.ttf',
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
