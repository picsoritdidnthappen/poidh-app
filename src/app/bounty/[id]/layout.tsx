import { Metadata } from 'next';
import React from 'react';

import '@/styles/colors.css';

import chainStatusStore from '@/store/chainStatus.store';
import { fetchBountyById } from '@/app/context/web3';

type Props = {
  params: { id: string };
};

//Refactor Change -- Make this a global util, used in multiple places
function weiToEther(weiValue: string | number | bigint): string {
  const etherValue = Number(weiValue) / 1e18;
  return etherValue.toFixed(6);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    // Read route params
    const id = params?.id;
    const currency = 'eth';
    const netName = 'base';

    chainStatusStore.setCurrentChainFromNetwork(netName);

    // Fetch data
    // Recator Change -- Look to see if instead of doing a blockchain Query, we instead
    const bountyData = await fetchBountyById(id);

    if (!bountyData) {
      throw new Error('Bounty data is null or undefined');
    }

    // Log fetched data for debugging
    console.log('Fetched bountyData:', bountyData);

    if (!bountyData.amount) {
      throw new Error('Bounty amount is null or undefined');
    }

    // Validate amount
    const bountyAmount = Number(bountyData.amount);
    if (isNaN(bountyAmount)) {
      throw new Error('Bounty amount is not a valid number');
    }

    return {
      title: bountyData?.name || '',
      description:
        weiToEther(bountyAmount) +
        ` ${currency} ` +
        (bountyData?.description || ''),

      openGraph: {
        title: bountyData?.name || '',
        description:
          weiToEther(bountyAmount) +
          ` ${currency} ` +
          (bountyData?.description || ''),
        siteName: 'POIDH',
        images: [`https://poidh.xyz/images/poidh-preview-hero.png`],
        type: 'website',
        locale: 'en_US',
      },
      twitter: {
        card: 'summary_large_image',
        title: bountyData?.name || '',
        description:
          weiToEther(bountyAmount) +
          ` ${currency} ` +
          (bountyData?.description || ''),
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
  return <>{children}</>;
}
