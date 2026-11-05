import type { Metadata } from 'next';
import { headers } from 'next/headers';
import IdeasPageClient from '@/components/ideas/IdeasPageClient';

type IdeasPageProps = {
  searchParams?: {
    open?: string | string[];
  };
};

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

export async function generateMetadata({
  searchParams,
}: IdeasPageProps): Promise<Metadata> {
  const origin = await getPublicOrigin();

  const ideasUrl = `${origin}/ideas`;

  // Allow a shared URL's ?open= parameter to produce
  // a unique OG image URL for social cache busting.
  const rawOpen = searchParams?.open;

  const refreshToken =
    typeof rawOpen === 'string' &&
    /^[a-zA-Z0-9_-]{1,64}$/.test(rawOpen)
      ? rawOpen
      : null;

  // Version bump for the regular /ideas URL too.
  // This avoids reusing the original cached image URL.
  const imageVersion = refreshToken ?? 'ideas-no-pill-20261104';

  const ogImage =
    `${origin}/api/og/ideas?v=${encodeURIComponent(imageVersion)}`;

  const farcasterImage =
    `${origin}/api/og/ideas?format=farcaster&v=${encodeURIComponent(imageVersion)}`;

  // Preserve the exact shared URL in Open Graph metadata,
  // while keeping /ideas as the canonical SEO URL.
  const sharedUrl = refreshToken
    ? `${ideasUrl}?open=${encodeURIComponent(refreshToken)}`
    : ideasUrl;

  const title = 'ideas | poidh';

  const description =
    'things people want to see happen. post ideas, vote, discuss, and fund future bounties on poidh.';

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
      url: sharedUrl,
      siteName: 'poidh',
      title,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: 'poidh ideas',
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
