import type { Metadata } from 'next';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';

const APP_URL = (process.env.NEXT_PUBLIC_URL || 'https://poidh.xyz').replace(/\/$/, '');
const ANALYTICS_URL = `${APP_URL}/analytics`;
const OG_IMAGE_URL = `${APP_URL}/api/og/analytics`;
const FARCASTER_IMAGE_URL = `${APP_URL}/api/og/analytics?format=farcaster`;
const SPLASH_URL = `${APP_URL}/mini-splash-v2.png`;
const DESCRIPTION =
  'Explore poidh v3 transaction activity and ETH volume across Ethereum, Arbitrum, and Base.';

const miniAppEmbed = {
  version: '1',
  imageUrl: FARCASTER_IMAGE_URL,
  button: {
    title: 'view poidh analytics',
    action: {
      type: 'launch_frame',
      name: 'poidh',
      url: ANALYTICS_URL,
      splashImageUrl: SPLASH_URL,
      splashBackgroundColor: '#6faae1',
    },
  },
};

export const metadata: Metadata = {
  title: 'poidh analytics | onchain activity',
  description: DESCRIPTION,
  alternates: { canonical: ANALYTICS_URL },
  openGraph: {
    type: 'website',
    url: ANALYTICS_URL,
    title: 'poidh analytics',
    description: DESCRIPTION,
    images: [{ url: OG_IMAGE_URL, width: 1200, height: 630, alt: 'poidh analytics — bounties, claims, and votes' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'poidh analytics',
    description: DESCRIPTION,
    images: [OG_IMAGE_URL],
  },
  other: {
    'fc:miniapp': JSON.stringify(miniAppEmbed),
    'fc:frame': JSON.stringify(miniAppEmbed),
  },
};

export default function AnalyticsPage() {
  return <AnalyticsDashboard />;
}
