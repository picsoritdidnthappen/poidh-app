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
  // read route params
  const id = params.id;
  let token = params.netname;
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

  chainStatusStore.setCurrentChainFromNetwork(netName);

  // fetch data
  const bountyData = await fetchBountyById(id);

  return {
    title: bountyData.name,
    description:
      weiToEther(bountyData.amount) + ` ${currency} ` + bountyData.description,

    openGraph: {
      title: bountyData.name,
      description:
        weiToEther(bountyData.amount) +
        ` ${currency} ` +
        bountyData.description,
      siteName: 'POIDH',
      images: [`https://poidh.xyz/images/poidh-preview-hero.png`],
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: bountyData.name,
      description:
        weiToEther(bountyData.amount) +
        ` ${currency} ` +
        bountyData.description,
      images: [`https://poidh.xyz/images/poidh-preview-hero.png`],
    },
  };
}

export default function BountyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}