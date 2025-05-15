import { chains } from '@/utils/config';
import { generateDynamicOGUrl } from '@/utils/og';
import { Netname } from '@/utils/types';
import { Metadata } from 'next';
import prisma from 'prisma/prisma';
import { createCallerFactory } from '@/trpc/init';
import { appRouter } from '@/trpc/routers/_app';
import { fetchPrice } from '@/utils/utils';

export const generateMetadataForBountyFrame = async ({
  params,
}: {
  params: { id: string; netname: Netname };
}): Promise<Metadata> => {
  const frame = {
    version: 'next',
    imageUrl: `https://poidh.xyz/frames/image?chainName=${params?.netname}&bountyId=${params?.id}`,
    button: {
      title: 'open bounty',
      action: {
        type: 'launch_frame',
        name: 'open bounty',
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
      images: [
        `${process.env.NEXT_PUBLIC_APP_URL}/images/poidh-preview-hero-v2.png`,
      ],
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: "poidh - pics or it didn't happen",
      description:
        "poidh - pics or it didn't happen - fully onchain bounties + collectible NFTs - start your collection today on Arbitrum, Base, or Degen Chain",
      images: [
        `${process.env.NEXT_PUBLIC_APP_URL}/images/poidh-preview-hero-v2.png`,
      ],
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

  let price: number | undefined;
  try {
    price = await fetchPrice({ currency: chain.currency });
  } catch (error) {
    console.error('Error fetching price:', error);
  }

  const ogImageUrl = generateDynamicOGUrl({
    type: 'bounty',
    dataObject: {
      title: bounty.title.slice(0, 150),
      description: bounty.description.slice(0, 600),
      chain: chain.slug,
      amount: bounty.amount?.toString() || '0',
      currency: chain.currency,
      price: price ? price.toString() : '',
    },
  });

  return {
    title: bounty.title,
    description: bounty.description,
    openGraph: {
      title: bounty.title,
      description: bounty.description,
      siteName: 'POIDH',
      images: [ogImageUrl],
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: bounty.title,
      description: bounty.description,
      images: [ogImageUrl],
    },
    other: {
      'fc:frame': JSON.stringify(frame),
    },
  };
};

export const generateMetadataForAccountPage = async ({
  params,
}: {
  params: { address: string; netname: Netname };
}): Promise<Metadata> => {
  const createCaller = createCallerFactory(appRouter);
  const trpcCaller = createCaller({});
  const address = params.address;
  const chain = chains[params.netname as keyof typeof chains];

  try {
    const accountStats = await trpcCaller.accountInfo({
      address,
      chainId: chain.id,
    });
    const nftsCount = await prisma.claims.count({
      where: {
        owner: address.toLowerCase(),
        chain_id: chain.id,
      },
    });

    const ogImageUrl = generateDynamicOGUrl({
      type: 'account',
      dataObject: {
        address,
        chain: chain.slug,
        poidhScore: `${accountStats.poidhScore ?? 0}`,
        totalEarn: `${accountStats.totalEarn.amountCrypto ?? 0} ${
          chain.currency
        }`,
        totalPaid: `${accountStats.totalPaid.amountCrypto ?? 0} ${
          chain.currency
        }`,
        nftsCount: `${nftsCount ?? 0}`,
      },
    });

    return {
      title: `Account ${address}`,
      description: `Account ${address} details`,
      openGraph: {
        title: `Account ${address}`,
        description: `Account ${address} details`,
        siteName: 'POIDH',
        images: [ogImageUrl],
        type: 'website',
        locale: 'en_US',
      },
      twitter: {
        card: 'summary_large_image',
        title: `Account ${address}`,
        description: `Account ${address} details`,
        images: [ogImageUrl],
      },
    };
  } catch (error) {
    console.error('Error generating metadata for account page:', error);
    return {
      title: "poidh - pics or it didn't happen",
      description:
        "poidh - pics or it didn't happen - fully onchain bounties + collectible NFTs - start your collection today on Arbitrum, Base, or Degen Chain",
      openGraph: {
        title: "poidh - pics or it didn't happen",
        description:
          "poidh - pics or it didn't happen - fully onchain bounties + collectible NFTs - start your collection today on Arbitrum, Base, or Degen Chain",
        siteName: 'POIDH',
        images: [`https://poidh.xyz/images/poidh-preview-hero-v2.png`],
        type: 'website',
        locale: 'en_US',
      },
      twitter: {
        card: 'summary_large_image',
        title: "poidh - pics or it didn't happen",
        description:
          "poidh - pics or it didn't happen - fully onchain bounties + collectible NFTs - start your collection today on Arbitrum, Base, or Degen Chain",
        images: [`https://poidh.xyz/images/poidh-preview-hero-v2.png`],
      },
    };
  }
};
