import BountyPreviewCard, {
  BountyPreviewData,
} from '@/components/og/BountyPreviewCard';
import BountyErrorCard from '@/components/og/BountyErrorCard';
import { ImageResponse, NextRequest } from 'next/server';
import { ChainId } from '@/utils/types';

export const runtime = 'edge';

const IMAGE_CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=0, must-revalidate',
  'Vercel-CDN-Cache-Control':
    'public, max-age=3600, stale-while-revalidate=86400, stale-if-error=86400',
};

let fontPromise: Promise<ArrayBuffer> | null = null;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const imageFormatParam = searchParams.get('imageFormat');

    const imageFormat: 'og' | 'preview' | undefined =
      imageFormatParam === 'og' || imageFormatParam === 'preview'
        ? imageFormatParam
        : undefined;

    const title = searchParams.get('title');
    const amount = searchParams.get('amount');
    const chainId = searchParams.get('chainId');
    const currencyRate = searchParams.get('currencyRate');
    const participants = searchParams.get('participants');

    if (!title || !amount || !currencyRate || !chainId || !participants) {
      return new Response('Missing or invalid parameters', {
        status: 400,
        headers: {
          'Cache-Control': 'no-store',
        },
      });
    }

    const participantAddresses = participants
      .split(',')
      .map((address) => address.trim())
      .filter(Boolean);

    const bountyPreviewData = {
      title,
      amount,
      chainId: Number(chainId) as ChainId,
      currencyRate: Number(currencyRate),
      participants: participantAddresses,
    } as BountyPreviewData;

    /*
     * Font loading and Farcaster enrichment are independent,
     * so perform them in parallel rather than sequentially.
     */
    const [fontData, farcasterParticipants] = await Promise.all([
      loadFont(),
      loadFarcasterParticipants(participantAddresses),
    ]);

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

        headers: IMAGE_CACHE_HEADERS,
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

        /*
         * Don't let a transient rendering/API error get cached
         * as the bounty's social image.
         */
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}

function loadFont(): Promise<ArrayBuffer> {
  /*
   * Reuse the font within a warm Edge isolate instead of
   * fetching and decoding it again for every OG request.
   */
  if (!fontPromise) {
    const fontUrl = new URL(
      '../../../../../public/fonts/GeistMono-Regular.ttf',
      import.meta.url
    );

    fontPromise = fetch(fontUrl)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load GeistMono font: ${response.status}`);
        }

        return response.arrayBuffer();
      })
      .catch((error) => {
        /*
         * Don't permanently poison the warm isolate if a
         * one-off font fetch fails.
         */
        fontPromise = null;
        throw error;
      });
  }

  return fontPromise;
}

async function loadFarcasterParticipants(addresses: string[]) {
  if (addresses.length === 0) {
    return {};
  }

  try {
    /*
     * Avoid sending duplicate wallet addresses through the
     * internal identity lookup.
     */
    const uniqueAddresses = [...new Set(addresses)];

    const res = await fetch(
      `${
        process.env.NEXT_PUBLIC_APP_URL
      }/api/trpc/neynar.usersData?input=${encodeURIComponent(
        JSON.stringify({
          json: {
            addresses: uniqueAddresses,
          },
        })
      )}`,
      {
        /*
         * Farcaster profile data does not need to be refreshed
         * for every individual OG render.
         */
        next: {
          revalidate: 300,
        },
      }
    );

    if (!res.ok) {
      return {};
    }

    const json = await res.json();

    const users: Array<{
      address: string;
      farcasterTag: string | null;
      pfpUrl: string | null;
    }> = json?.result?.data?.json ?? [];

    const result: {
      [address: string]: Array<{
        username: string;
        pfp_url: string;
      }>;
    } = {};

    for (const user of users) {
      if (user.farcasterTag) {
        result[user.address] = [
          {
            username: user.farcasterTag,
            pfp_url: user.pfpUrl ?? '',
          },
        ];
      }
    }

    return result;
  } catch {
    /*
     * Social enrichment should never prevent the OG image
     * itself from rendering.
     */
    return {};
  }
}
