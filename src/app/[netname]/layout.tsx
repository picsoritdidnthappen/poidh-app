import { Metadata } from 'next';
import Head from 'next/head';
import { headers } from 'next/headers';
import React from 'react';

import '@/styles/globals.css';
import '@/styles/colors.css';

type Props = {
  params: { id: string; netname: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const _netname = params?.netname;
    const netname =
      _netname === 'base'
        ? 'Base'
        : _netname === 'arbitrum'
        ? 'Arbitrum'
        : 'Degen Chain';

    return {
      title: `poidh on ${netname} - pics or it didn't happen`,
      description:
        "poidh - pics or it didn't happen - fully onchain bounties + collectible NFTs - start your collection today on Arbitrum, Base, or Degen Chain",
    };
  } catch (error) {
    // console.log('layout open graph error: ', error);
    return {};
  }
}

const CanonicalWrapper = async ({
  children,
}: {
  children: React.ReactNode;
}) => {
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
};

export default CanonicalWrapper;
