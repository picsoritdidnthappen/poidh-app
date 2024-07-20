import { Metadata } from 'next';
import * as React from 'react';
import { fetchBountyById } from '@/app/context/web3';
import chainStatusStore from '@/store/chainStatus.store';
import Head from 'next/head';

import '@/styles/colors.css';

type Props = {
  params: { id: string; netname: string };
};

function weiToEther(weiValue: string | number | bigint): string {
  const etherValue = Number(weiValue) / 1e18;
  return etherValue.toFixed(6);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const id = params?.id;
    const token = params?.netname || null;

    let currency = 'degen';
    let netName = 'base';

    if (token && ['base', 'degen', 'arbitrum'].includes(token)) {
      netName = token;
    }

    if (!netName || netName === 'arbitrum' || netName === 'base') {
      currency = 'eth';
    }

    await chainStatusStore.setCurrentChainFromNetwork(netName, true);
    const bountyData = await fetchBountyById(id);

    return {
      title: bountyData?.name || '',
      description: bountyData?.description || '',
      openGraph: {
        title: bountyData?.name || '',
        description: bountyData?.description || '',
        siteName: 'POIDH',
        images: [`https://poidh.xyz/images/poidh-preview-hero.png`],
        type: 'website',
        locale: 'en_US',
      },
      twitter: {
        card: 'summary_large_image',
        title: bountyData?.name || '',
        description: bountyData?.description || '',
        images: [`https://poidh.xyz/images/poidh-preview-hero.png`],
      },
    };
  } catch (error) {
    console.log('layout open graph error: ', error);
    return {};
  }
}

export default function BountyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Head>
        <></> {/* Ensure Head has children */}
      </Head>
      {children}
    </>
  );
}
