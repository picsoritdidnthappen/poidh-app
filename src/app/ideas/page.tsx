import type { Metadata } from 'next';
import IdeasPageClient from '@/components/ideas/IdeasPageClient';

export const metadata: Metadata = {
  title: 'ideas | poidh',
  description: 'find, vote on, and discuss ideas for future poidh bounties',
};

export default function IdeasPage() {
  return <IdeasPageClient />;
}
