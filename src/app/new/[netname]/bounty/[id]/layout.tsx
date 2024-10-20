/* eslint-disable import/order */
import { Metadata } from 'next';
import prisma from 'prisma/prisma';
import * as React from 'react';

import '@/styles/colors.css';

import chainStatusStore from '@/store/new/chainStatus.store';

import { Netname } from '@/types/new/web3';

type Props = {
  params: { id: string; netname: Netname };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = params.id;
  const netname = params.netname;

  chainStatusStore.setCurrentChainFromNetwork(netname);

  const bounty = await prisma.bounty.findFirst({
    where: {
      primaryId: id,
      chainId: chainStatusStore.currentChain?.id,
    },
  });

  return {
    title: bounty?.title || '',
    description: bounty?.description || '',

    openGraph: {
      title: bounty?.title || '',
      description: bounty?.description || '',
      siteName: 'POIDH',
      images: [`https://poidh.xyz/images/poidh-preview-hero.png`],
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: bounty?.title || '',
      description: bounty?.description || '',
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
