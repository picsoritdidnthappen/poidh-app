import { chains } from '@/utils/config';
import { Netname } from '@/utils/types';
import { Metadata } from 'next';
import prisma from 'prisma/prisma';
import serverEnv from '@/utils/serverEnv';

const APP_URL = serverEnv.VERCEL_URL;

export const generateMetadataForBountyFrame = async ({
  params,
}: {
  params: { id: string; netname: Netname };
}): Promise<Metadata> => {
  const frame = {
    version: 'next',
    imageUrl: `https://poidh.xyz/frames/image?chainName=${params?.netname}&bountyId=${params?.id}`,
    button: {
      title: 'See Claims',
      action: {
        type: 'launch_frame',
        name: 'See Claims',
        url: `https://poidh.xyz/frames/${params?.netname}/${params?.id}`,
        splashImageUrl: `https://poidh.xyz/Logo_poidh.svg`,
        splashBackgroundColor: '#93c5fd',
      },
    },
  };

  const id = params.id;
  const chain = chains[params.netname as keyof typeof chains];

  const defaultMetadata = {
    title: "poidh - pics or it didn't happen",
    description:
      "poidh - pics or it didn't happen - fully onchain bounties + collectible NFTs - start your collection today on Arbitrum, Base, or Degen Chain",
    openGraph: {
      title: "poidh - pics or it didn't happen",
      description:
        "poidh - pics or it didn't happen - fully onchain bounties + collectible NFTs - start your collection today on Arbitrum, Base, or Degen Chain",
      siteName: 'POIDH',
      images: [`${APP_URL}/images/poidh-preview-hero.png`],
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: "poidh - pics or it didn't happen",
      description:
        "poidh - pics or it didn't happen - fully onchain bounties + collectible NFTs - start your collection today on Arbitrum, Base, or Degen Chain",
      images: [`${APP_URL}/images/poidh-preview-hero.png`],
    },
    other: {
      'fc:frame': JSON.stringify(frame),
    },
  };

  if (id === 'null') {
    return defaultMetadata;
  }

  const bounty = await prisma.bounties.findUnique({
    where: {
      id_chain_id: {
        id: Number(id),
        chain_id: chain.id,
      },
    },
  });

  if (!bounty) {
    return defaultMetadata;
  }

  return {
    title: bounty.title,
    description: bounty.description,
    openGraph: {
      title: bounty.title,
      description: bounty.description,
      siteName: 'POIDH',
      images: [`${APP_URL}/images/poidh-preview-hero.png`],
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: bounty.title,
      description: bounty.description,
      images: [`${APP_URL}/images/poidh-preview-hero.png`],
    },
    other: {
      'fc:frame': JSON.stringify(frame),
    },
  };
};
