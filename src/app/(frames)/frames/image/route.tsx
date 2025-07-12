// app/api/frame/route.tsx
import BountyPreviewCard, {
  BountyPreviewData,
} from '@/components/frame/claims/BountyPreviewCard';
import BountyErrorCard from '@/components/frame/claims/Error';
import { ImageResponse, NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bountyFrameDataEncoded = searchParams.get('bountyFrameData');
    if (!bountyFrameDataEncoded) {
      return new ImageResponse(
        <BountyErrorCard message='Missing bounty data.' />,
        {
          width: 570,
          height: 320,
        }
      );
    }
    const bountyFrameData = JSON.parse(
      decodeURIComponent(bountyFrameDataEncoded)
    ) as BountyPreviewData;
    const fontData = await loadFont();

    return new ImageResponse(
      <BountyPreviewCard bountyData={bountyFrameData} />,
      {
        width: 570,
        height: 320,
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
        width: 570,
        height: 320,
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
