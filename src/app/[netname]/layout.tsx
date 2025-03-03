import { Metadata } from 'next';
import React from 'react';

import { Netname } from '@/utils/types';

type Props = {
  children: React.ReactNode;
  params: { netname: Netname };
};

const NETNAME_MAP: { [key in Netname]: string } = {
  base: 'Base',
  arbitrum: 'Arbitrum',
  degen: 'Degen Chain',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const netname = NETNAME_MAP[params.netname] || 'Base';

  return {
    title: `poidh on ${netname} - pics or it didn't happen`,
    description:
      "poidh - pics or it didn't happen - fully onchain bounties + collectible NFTs - start your collection today on Arbitrum, Base, or Degen Chain",
  };
}

export default function Layout({ children }: Props) {
  return children;
}
