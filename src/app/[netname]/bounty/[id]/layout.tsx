import { Metadata } from 'next';
import * as React from 'react';

import '@/styles/colors.css';

import chainStatusStore from '@/store/chainStatus.store';
import { fetchBountyById } from '@/app/context/web3';

type Props = {
  params: { id: string; netname: string };
};

// function weiToEther(weiValue: string | number | bigint): string {
//   const etherValue = Number(weiValue) / 1e18;
//   return etherValue.toFixed(6);
// }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    // read route params
    const id = params?.id;
    let token = null;
    try {
      token = params.netname;
    } catch (error) {
      // console.log('params?.netname open graph error: ', error);
      return {};
    }
    let currency = 'degen';

    let netName = 'base';
    if (
      token &&
      (token === 'base' || token === 'degen' || token === 'arbitrum')
    ) {
      netName = token;
    }

    if (
      !netName ||
      netName === '' ||
      netName == 'arbitrum' ||
      netName == 'base'
    ) {
      currency = 'eth';
    }

    // fetch data
    chainStatusStore.setCurrentChainFromNetwork(netName);
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
    // console.log('layout open graph error: ', error);
    return {};
  }
}

// Ensure that the layout component is correctly exporting the children
export default function BountyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
