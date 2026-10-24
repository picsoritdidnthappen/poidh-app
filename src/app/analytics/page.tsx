import type { Metadata } from 'next';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';

// Match the base URL used by the existing poidh root layout.
const APP_URL = (process.env.NEXT_PUBLIC_URL || 'https://poidh.xyz').replace(/\/$/, '');
const ANALYTICS_URL = `${APP_URL}/analytics`;
const IMAGE_URL = `${APP_URL}/images/poidh-preview-hero-v2.png`;
const SPLASH_URL = `${APP_URL}/mini-splash-v2.png`;
const DESCRIPTION =
  'Explore poidh v3 transaction activity and ETH volume across Ethereum, Arbitrum, and Base.';

const miniAppEmbed = {
  version: '1',
  imageUrl: IMAGE_URL,
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
    images: [{ url: IMAGE_URL, width: 600, height: 400, alt: 'poidh analytics' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'poidh analytics',
    description: DESCRIPTION,
    images: [IMAGE_URL],
  },
  other: {
    'fc:miniapp': JSON.stringify(miniAppEmbed),
    'fc:frame': JSON.stringify(miniAppEmbed),
  },
};

export default function AnalyticsPage() {
  return <AnalyticsDashboard />;
}
