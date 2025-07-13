import { chains } from '@/utils/config';
import { generateDynamicOGUrl } from '@/utils/og';
import { Currency, Netname } from '@/utils/types';
import { Metadata } from 'next';
import prisma from 'prisma/prisma';
import { createCallerFactory } from '@/trpc/init';
import { appRouter } from '@/trpc/routers/_app';
import { fetchPrice } from '@/utils/utils';
import { formatEther } from 'viem';
import serverEnv from '@/utils/serverEnv';
import { BountyPreviewData } from '@/components/frame/claims/BountyPreviewCard';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://poidh.xyz';
const APP_ICON_URL =
  `${process.env.NEXT_PUBLIC_APP_URL}/icon.png` || 'https://poidh.xyz/icon.png';
const APP_SPLASH_URL =
  `${process.env.NEXT_PUBLIC_APP_URL}/Logo_poidh.svg` ||
  'https://poidh.xyz/Logo_poidh.svg';
const APP_SPLASH_BACKGROUND_COLOR = '#2a81d5';
const APP_OG_IMAGE_URL =
  `${process.env.NEXT_PUBLIC_APP_URL}/images/poidh-preview-hero-v2.png` ||
  `https://poidh.xyz/images/poidh-preview-hero-v2.png`;
const APP_BUTTON_TEXT = 'launch poidh';
const APP_NAME = 'poidh';

export const generateMetadataForBountyFrame = async ({
  params,
}: {
  params: { id: string; netname: Netname };
}): Promise<Metadata> => {
  const createCaller = createCallerFactory(appRouter);
  const trpcCaller = createCaller({});
  const chain = chains[params.netname as keyof typeof chains];
  const id = Number(params.id);
  const price: number | undefined = await safeFetchPrice({
    currency: chain.currency,
  });

  let bounty = null;
  if (!Number.isNaN(id)) {
    bounty = await prisma.bounties.findUnique({
      where: {
        id_chain_id: {
          id: id,
          chain_id: chain.id,
        },
      },
      include: {
        participations: {
          select: {
            amount: true,
            user_address: true,
          },
        },
      },
    });
  }

  if (!bounty) {
    const frame = buildFrame({ bountyFrameData: null, params });

    return {
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
    } satisfies Metadata;
  }

  const farcasterUsers = await getFarcasterParticipants(
    bounty?.participations,
    trpcCaller
  );

  const bountyFrameData = {
    title: bounty?.title,
    amount: bounty?.amount,
    chainName: chain.slug,
    currency: chain.currency,
    currencyRate: price,
    participants: farcasterUsers,
  } as BountyPreviewData;

  const frame = buildFrame({ bountyFrameData, params });

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

export const generateMetadataForNetnameFrame = async ({
  params,
}: {
  params: { netname: Netname };
}): Promise<Metadata> => {
  const frame = {
    version: 'next',
    imageUrl: APP_OG_IMAGE_URL,
    button: {
      title: APP_BUTTON_TEXT,
      action: {
        type: 'launch_frame',
        name: APP_NAME,
        url: `${APP_URL}/${params?.netname}`,
        splashImageUrl: APP_SPLASH_URL,
        iconUrl: APP_ICON_URL,
        splashBackgroundColor: APP_SPLASH_BACKGROUND_COLOR,
      },
    },
  };

  const chainNames: Record<Netname, string> = {
    arbitrum: 'Arbitrum',
    base: 'Base',
    degen: 'Degen Chain',
  };

  const chainDisplayName = chainNames[params.netname] || params.netname;
  return {
    title: `${chainDisplayName} bounties on poidh - pics or it didn't happen`,
    description:
      "poidh - pics or it didn't happen - fully onchain bounties + collectible NFTs - start your collection today on Arbitrum, Base, or Degen Chain",
    openGraph: {
      type: 'website',
      url: APP_URL,
      title: `${chainDisplayName} bounties on poidh - pics or it didn't happen`,
      description:
        "poidh - pics or it didn't happen - fully onchain bounties + collectible NFTs - start your collection today on Arbitrum, Base, or Degen Chain",
      siteName: 'POIDH',
      images: [
        {
          url: APP_OG_IMAGE_URL,
          width: 600,
          height: 400,
          alt: `${chainDisplayName} bounties on poidh - pics or it didn't happen`,
        },
      ],
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${chainDisplayName} bounties on poidh - pics or it didn't happen`,
      description:
        "poidh - pics or it didn't happen - fully onchain bounties + collectible NFTs - start your collection today on Arbitrum, Base, or Degen Chain",
      images: [APP_OG_IMAGE_URL],
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

  const frame = {
    version: 'next',
    imageUrl: APP_OG_IMAGE_URL,
    button: {
      title: 'view profile',
      action: {
        type: 'launch_frame',
        name: 'view profile',
        url: `${APP_URL}/${params?.netname}/account/${params?.address}`,
        splashImageUrl: APP_SPLASH_URL,
        iconUrl: APP_ICON_URL,
        splashBackgroundColor: APP_SPLASH_BACKGROUND_COLOR,
      },
    },
  };

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
      other: {
        'fc:frame': JSON.stringify(frame),
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
      other: {
        'fc:frame': JSON.stringify(frame),
      },
    };
  }
};

async function safeFetchPrice({
  currency,
}: {
  currency: Currency;
}): Promise<number | undefined> {
  try {
    return await fetchPrice({ currency });
  } catch (error) {
    console.error('Error fetching price:', error);
    return undefined;
  }
}

async function getFarcasterParticipants(
  participations: { amount: string; user_address: string }[],
  trpcCaller: any
) {
  if (!participations?.length) return [] as const;

  const sorted = [...participations]
    .sort(
      (a, b) =>
        Number(formatEther(BigInt(b.amount))) -
        Number(formatEther(BigInt(a.amount)))
    )
    .slice(0, 8); // limit number of participants to 8

  const results: {
    address: string;
    farcasterName: string | null;
    pfpUrl: string | null;
  }[] = [];

  for (const participation of sorted) {
    try {
      const farcasterUser = await trpcCaller.farcasterUser({
        address: participation.user_address,
      });
      results.push({
        address: participation.user_address,
        farcasterName:
          farcasterUser[participation.user_address][0]?.username ?? null,
        pfpUrl: farcasterUser[participation.user_address][0]?.pfp_url ?? null,
      });
    } catch {
      results.push({
        address: participation.user_address,
        farcasterName: null,
        pfpUrl: null,
      });
    }
  }

  return results;
}

function buildFrame({
  bountyFrameData,
  params,
}: {
  bountyFrameData: BountyPreviewData | null;
  params: { id: string; netname: Netname };
}) {
  const bountyFrameDataEncoded = bountyFrameData
    ? encodeURIComponent(JSON.stringify(bountyFrameData))
    : '';
  return {
    version: 'next',
    imageUrl: `${serverEnv.NEXT_PUBLIC_APP_URL}/frames/image?bountyFrameData=${bountyFrameDataEncoded}`,
    button: {
      title: 'view bounty',
      action: {
        type: 'launch_frame',
        name: 'poidh',
        url: `${APP_URL}/${params.netname}/bounty/${params.id}`,
        splashImageUrl: APP_SPLASH_URL,
        iconUrl: APP_ICON_URL,
        splashBackgroundColor: APP_SPLASH_BACKGROUND_COLOR,
      },
    },
  };
}
