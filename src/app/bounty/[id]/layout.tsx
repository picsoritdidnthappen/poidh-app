import { Metadata } from 'next';
import React from 'react';

import '@/styles/colors.css';

import { weiToEth } from '@/lib';
import chainStatusStore from '@/store/chainStatus.store';
import { fetchBountyById } from '@/app/context/web3';

type Props = {
  params: { id: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const id = params?.id;
    const currency = 'eth';
    const netName = 'base';

    chainStatusStore.setCurrentChainFromNetwork(netName);

    const bountyData = await fetchBountyById(id);

    if (!bountyData) {
      throw new Error('Bounty data is null or undefined');
    }


    if (!bountyData.amount) {
      throw new Error('Bounty amount is null or undefined');
    }

    const bountyAmount = Number(bountyData.amount);
    if (isNaN(bountyAmount)) {
      throw new Error('Bounty amount is not a valid number');
    }

    return {
      title: bountyData?.name || '',
      description:
        weiToEth(bountyAmount) +
        ` ${currency} ` +
        (bountyData?.description || ''),

      openGraph: {
        title: bountyData?.name || '',
        description:
          weiToEth(bountyAmount) +
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
          weiToEth(bountyAmount) +
          ` ${currency} ` +
          (bountyData?.description || ''),
        images: [`https://poidh.xyz/images/poidh-preview-hero.png`],
      },
    };
  } catch (error) {

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
