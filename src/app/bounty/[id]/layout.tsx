import { Metadata } from 'next';
import * as React from 'react';
import { fetchBountyById } from '@/app/context/web3';
import '@/styles/colors.css';

type Props = {
  params: { id: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // read route params
  const id = params.id;

  // fetch data
  const bountyData = await fetchBountyById(id);

  return {
    title: bountyData.name,
    description: bountyData.description,

    openGraph: {
      title: bountyData.name,
      description: bountyData.description,
      siteName: 'POIDH',
      images: [`https://poidh.xyz/images/poidh-preview-hero.png`],
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: bountyData.name,
      description: bountyData.description,
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
