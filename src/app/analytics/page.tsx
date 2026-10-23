import type { Metadata } from 'next';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';

export const metadata: Metadata = {
  title: 'poidh analytics | onchain activity',
  description:
    'Explore poidh transaction activity across Ethereum, Arbitrum, and Base, powered by the poidh indexer.',
  alternates: {
    canonical: '/analytics',
  },
};

export default function AnalyticsPage() {
  return <AnalyticsDashboard />;
}
