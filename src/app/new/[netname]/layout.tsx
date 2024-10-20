import { Metadata } from 'next';
import Head from 'next/head';
import { headers } from 'next/headers';
import React from 'react';

import '@/styles/globals.css';
import '@/styles/colors.css';

import { Netname } from '@/types/new/web3';

type Props = {
  params: { id: string; netname: Netname };
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

export default function CanonicalWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = headers();
  const referer = headersList.get('referer');
  const url = referer ? String(referer) : '';

  return (
    <>
      <Head>
        <link rel='canonical' href={url} />
      </Head>
      <>{children}</>
    </>
  );
}
