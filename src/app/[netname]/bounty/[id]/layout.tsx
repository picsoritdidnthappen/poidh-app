import { Metadata } from 'next';
import * as React from 'react';
import { fetchBountyById } from '@/app/context/web3';
import chainStatusStore from '@/store/chainStatus.store';

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
    // read route params
    const id = params?.id;
    let token = null;
    try {
      token = params.netname;
    } catch (error) {
      console.log('params?.netname open graph error: ', error);
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

    console.log('token: ', token);
    console.log('netName: ', netName);
    console.log('currency: ', currency);

    // fetch data
    chainStatusStore.setCurrentChainFromNetwork(netName);
    const bountyData = await fetchBountyById(id);

    console.log('layout bountyData: ', bountyData);

    return {
      title: 'Static Title',
      description: 'Static Description',
      openGraph: {
        title: 'Static OpenGraph Title',
        description: 'Static OpenGraph Description',
        siteName: 'POIDH',
        images: ['https://poidh.xyz/images/poidh-preview-hero.png'],
        type: 'website',
        locale: 'en_US',
      },
      twitter: {
        card: 'summary_large_image',
        title: 'Static Twitter Title',
        description: 'Static Twitter Description',
        images: ['https://poidh.xyz/images/poidh-preview-hero.png'],
      },
    };

    // return {
    //   title: bountyData?.name,
    //   description:
    //     weiToEther(Number(bountyData?.amount)) +
    //     ` ${currency} ` +
    //     bountyData?.description,

    //   openGraph: {
    //     title: bountyData?.name,
    //     description:
    //       weiToEther(Number(bountyData?.amount)) +
    //       ` ${currency} ` +
    //       bountyData?.description,
    //     siteName: 'POIDH',
    //     images: [`https://poidh.xyz/images/poidh-preview-hero.png`],
    //     type: 'website',
    //     locale: 'en_US',
    //   },
    //   twitter: {
    //     card: 'summary_large_image',
    //     title: bountyData?.name,
    //     description:
    //       weiToEther(Number(bountyData?.amount)) +
    //       ` ${currency} ` +
    //       bountyData?.description,
    //     images: [`https://poidh.xyz/images/poidh-preview-hero.png`],
    //   },
    // };
  } catch (error) {
    console.log('layout open graph error: ', error);
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
