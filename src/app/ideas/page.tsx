import type { Metadata } from 'next';
import { headers } from 'next/headers';
import IdeasPageClient from '@/components/ideas/IdeasPageClient';

// Keep staging and production social previews separate.
async function getPublicOrigin() {
  const requestHeaders = await headers();

  const host = (
    requestHeaders.get('x-forwarded-host') ??
    requestHeaders.get('host') ??
    ''
  )
    .split(',')[0]
    .trim()
    .toLowerCase();

  return host === 'staging.poidh.xyz'
    ? 'https://staging.poidh.xyz'
    : 'https://poidh.xyz';
}

export async function generateMetadata(): Promise<Metadata> {
  const origin = await getPublicOrigin();

  const ideasUrl = `${origin}/ideas`;
  const ogImage = `${origin}/api/og/ideas`;
  const farcasterImage =
    `${origin}/api/og/ideas?format=farcaster`;

  const title = 'ideas | poidh';

  const description =
    'things people want to see happen. post ideas, vote, discuss, and fund future bounties on poidh.';

  // Same Farcaster Mini App format used by
  // poidh's existing bounty draft pages.
  const miniAppEmbed = {
    version: '1',
    imageUrl: farcasterImage,
    button: {
      title: 'browse ideas',
      action: {
        type: 'launch_frame',
        name: 'poidh',
        url: ideasUrl,
        splashImageUrl: `${origin}/mini-splash-v2.png`,
        splashBackgroundColor: '#6faae1',
      },
    },
  };

  return {
    metadataBase: new URL(origin),

    title,
    description,

    alternates: {
      canonical: ideasUrl,
    },

    openGraph: {
      type: 'website',
      url: ideasUrl,
      siteName: 'poidh',
      title,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: 'poidh ideas — things people want to see happen',
          type: 'image/png',
        },
      ],
    },

    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },

    other: {
      'fc:miniapp': JSON.stringify(miniAppEmbed),
      'fc:frame': JSON.stringify(miniAppEmbed),
    },
  };
}

export default function IdeasPage() {
  return <IdeasPageClient />;
}
