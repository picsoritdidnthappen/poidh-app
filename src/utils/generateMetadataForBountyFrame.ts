import { chains } from '@/utils/config';
import { Netname } from '@/utils/types';
import { Metadata } from 'next';
import prisma from 'prisma/prisma';

const appUrl = 'https://poidh.xyz';

export const generateMetadataForBountyFrame = async ({
  params,
}: {
  params: { id: string; netname: Netname };
}): Promise<Metadata> => {
  const frame = {
    version: 'next',
    imageUrl: `${appUrl}/frames/image?chainName=${params?.netname}&bountyId=${params?.id}`,
    button: {
      title: 'See Claims',
      action: {
        type: 'launch_frame',
        name: 'See Claims',
        url: `${appUrl}/frames/${params?.netname}/${params?.id}`,
        splashImageUrl: `${appUrl}/Logo_poidh.svg`,
        splashBackgroundColor: '#93c5fd',
      },
    },
  };

  const id = params.id;
  const chain = chains[params.netname as keyof typeof chains];

  const bounty = await prisma.bounties.findFirst({
    where: {
      id: Number(id),
      chain_id: chain.id,
    },
  });

  return {
    title: bounty?.title || "poidh - pics or it didn't happen",
    description:
      bounty?.description ||
      "poidh - pics or it didn't happen - fully onchain bounties + collectible NFTs - start your collection today on Arbitrum, Base, or Degen Chain",
    openGraph: {
      title: bounty?.title || "poidh - pics or it didn't happen",
      description:
        bounty?.description ||
        "poidh - pics or it didn't happen - fully onchain bounties + collectible NFTs - start your collection today on Arbitrum, Base, or Degen Chain",
      siteName: 'POIDH',
      images: ['https://poidh.xyz/images/poidh-preview-hero.png'],
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: bounty?.title || "poidh - pics or it didn't happen",
      description:
        bounty?.description ||
        "poidh - pics or it didn't happen - fully onchain bounties + collectible NFTs - start your collection today on Arbitrum, Base, or Degen Chain",
      images: ['https://poidh.xyz/images/poidh-preview-hero.png'],
    },
    other: {
      'fc:frame': JSON.stringify(frame),
    },
  };
};
