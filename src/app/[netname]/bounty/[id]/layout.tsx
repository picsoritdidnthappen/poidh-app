import { Metadata } from 'next';
import * as React from 'react';

import '@/styles/colors.css';

import { fetchBountyById } from '@/app/context/web3';

type Props = {
  params: { id: string };
};

function weiToEther(weiValue: string | number | bigint): string {
  const etherValue = Number(weiValue) / 1e18;
  return etherValue.toFixed(0);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // read route params
  const id = params.id;

  // fetch data
  const bountyData = await fetchBountyById(id);

  return {
    title: bountyData.name,
    description:
      weiToEther(bountyData.amount) + ' degen ' + bountyData.description,

    openGraph: {
      url: 'https://degen.poidh.xyz',
      title: bountyData.name,
      description:
        weiToEther(bountyData.amount) + ' degen ' + bountyData.description,
      siteName: 'POIDH',
      images: [`https://degen.poidh.xyz/images/poidh-preview-hero.png`],
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: bountyData.name,
      description:
        weiToEther(bountyData.amount) + ' degen ' + bountyData.description,
      images: [`https://degen.poidh.xyz/images/poidh-preview-hero.png`],
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
