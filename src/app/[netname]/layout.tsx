import React from 'react';

import '@/styles/globals.css';
import '@/styles/colors.css';
import { Metadata } from 'next';

type Props = {
  params: { id: string; netname: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    // read route params
    const _netname = params?.netname;
    const netname =
      _netname === 'base'
        ? 'Base'
        : _netname === 'arbitrum'
        ? 'Arbitrum'
        : 'Degen Chain';

    return {
      title:
        `poidh on ${netname} - pics or it didn't happen` ||
        'poidh - pics or it didn\t happen',
      description:
        "poidh - pics or it didn't happen - fully onchain bounties + collectible NFTs - start your collection today on Arbitrum, Base, or Degen Chain",
    };
  } catch (error) {
    console.log('layout open graph error: ', error);
    return {};
  }
}

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html>
    <head></head>
    <body className='bg-blue-300 text-white'>{children}</body>
  </html>
);

export default RootLayout;
