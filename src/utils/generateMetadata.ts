import { chains } from '@/utils/config';
import { generateDynamicOGUrl } from '@/utils/og';
import { Currency, Netname } from '@/utils/types';
import { Metadata } from 'next';
import prisma from 'prisma/prisma';
import { createCallerFactory } from '@/trpc/init';
import { appRouter } from '@/trpc/trpc';
import { fetchPrice } from '@/utils/utils';
import { formatEther } from 'viem';

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

export const generateMetadataForBounty = async ({
  params,
}: {
  params: { id: string; netname: Netname };
}): Promise<Metadata> => {
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
    const frame = buildFrame({
      previewImageUrl: `${process.env.NEXT_PUBLIC_APP_URL}/images/poidh-preview-hero-v2.png`,
      params,
    });

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
      },
      other: {
        'fc:frame': JSON.stringify(frame),
      },
    } satisfies Metadata;
  }

  const bountyDataObject = {
    title: bounty?.title.slice(0, 100),
    amount: bounty?.amount,
    chainId: chain.id,
    currencyRate: price,
    participants: getSortedParticipants(bounty?.participations),
  };
  const frame = buildFrame({
    previewImageUrl: generateDynamicOGUrl({
      type: 'bounty',
      dataObject: bountyDataObject,
      imageFormat: 'preview',
    }),
    params,
  });

  return {
    title: bounty.title,
    description: bounty.description,
    openGraph: {
      title: bounty.title,
      description: bounty.description,
      siteName: 'POIDH',
      images: [
        generateDynamicOGUrl({
          type: 'bounty',
          dataObject: bountyDataObject,
        }),
      ],
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
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
  params: { address: string };
}): Promise<Metadata> => {
  const createCaller = createCallerFactory(appRouter);
  const trpcCaller = createCaller({});
  const address = params.address;

  const frame = {
    version: 'next',
    imageUrl: APP_OG_IMAGE_URL,
    button: {
      title: 'view profile',
      action: {
        type: 'launch_frame',
        name: 'view profile',
        url: `${APP_URL}/account/${params?.address}`,
        splashImageUrl: APP_SPLASH_URL,
        iconUrl: APP_ICON_URL,
        splashBackgroundColor: APP_SPLASH_BACKGROUND_COLOR,
      },
    },
  };

  try {
    const split = await trpcCaller.accounts.stats({ address });
    const accountActivitiesCount = await trpcCaller.accounts.activitiesCount({
      address,
    });
    const accountDataObject = {
      address,
      chain: 'base',
      poidhScore: split.poidhScore,
      totalBounties: accountActivitiesCount.bounties,
      totalClaims: accountActivitiesCount.claims,
    };

    frame.imageUrl = generateDynamicOGUrl({
      type: 'account',
      dataObject: accountDataObject,
      imageFormat: 'preview',
    });

    return {
      title: `Account ${address}`,
      description: `Account ${address} details`,
      openGraph: {
        title: `Account ${address}`,
        description: `Account ${address} details`,
        siteName: 'POIDH',
        images: [
          generateDynamicOGUrl({
            type: 'account',
            dataObject: accountDataObject,
          }),
        ],
        type: 'website',
        locale: 'en_US',
      },
      twitter: {
        card: 'summary_large_image',
      },
      other: {
        'fc:frame': JSON.stringify(frame),
      },
    };
  } catch (error) {
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
      },
      other: {
        'fc:frame': JSON.stringify(frame),
      },
    };
  }
};

export const generateMetadataForLeaderboardPage = (): Metadata => {
  const title = "poidh leaderboard - pics or it didn't happen";
  const description =
    "view the top performers on poidh - see who's leading in bounty completions and earnings across all chains";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: 'POIDH',
      images: [APP_OG_IMAGE_URL],
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
    },
    other: {
      'fc:frame': JSON.stringify({
        version: 'next',
        imageUrl: APP_OG_IMAGE_URL,
        button: {
          title: 'view leaderboard',
          action: {
            type: 'launch_frame',
            name: APP_NAME,
            url: `${APP_URL}/leaderboard`,
            splashImageUrl: APP_SPLASH_URL,
            iconUrl: APP_ICON_URL,
            splashBackgroundColor: APP_SPLASH_BACKGROUND_COLOR,
          },
        },
      }),
    },
  } satisfies Metadata;
};

export const generateMetadataForAlbumPage = ({
  params,
}: {
  params: { album: string };
}): Metadata => {
  const title = `${params.album} bounties on poidh`;
  const description = `view ${params.album} bounties on poidh - see all current bounties, view all past bounties, or create a new bounty within the ${params.album} album`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: 'POIDH',
      images: [
        `https://poidh.xyz/api/og/album?album=${params.album}&imageFormat=og`,
        APP_OG_IMAGE_URL,
      ],
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
    },
    other: {
      'fc:frame': JSON.stringify({
        version: 'next',
        imageUrl: `https://poidh.xyz/api/og/album?album=${params.album}&imageFormat=preview`,
        button: {
          title,
          action: {
            type: 'launch_frame',
            name: 'view album',
            url: `${APP_URL}/a/${params.album}`,
            splashImageUrl: APP_SPLASH_URL,
            iconUrl: APP_ICON_URL,
            splashBackgroundColor: APP_SPLASH_BACKGROUND_COLOR,
          },
        },
      }),
    },
  };
};

export const generateMetadaForFeedPage = (): Metadata => {
  const title = 'poidh feed - view activity as it happens';
  const description =
    'view the complete poidh activity feed - see new bounties, new claims, and winner announcements as they happen';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: 'POIDH',
      images: [APP_OG_IMAGE_URL],
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
    },
    other: {
      'fc:frame': JSON.stringify({
        version: 'next',
        imageUrl: APP_OG_IMAGE_URL,
        button: {
          title: 'view the feed',
          action: {
            type: 'launch_frame',
            name: APP_NAME,
            url: `${APP_URL}/feed`,
            splashImageUrl: APP_SPLASH_URL,
            iconUrl: APP_ICON_URL,
            splashBackgroundColor: APP_SPLASH_BACKGROUND_COLOR,
          },
        },
      }),
    },
  } satisfies Metadata;
};

export const generateMetadaForExplorePage = (): Metadata => {
  const title = 'explore poidh bounties & albums';
  const description =
    'search poidh bounties and albums by keyword - from silly meme contests to robust public goods funding, poidh has content across a diverse range of topics';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: 'POIDH',
      images: [APP_OG_IMAGE_URL],
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
    },
    other: {
      'fc:frame': JSON.stringify({
        version: 'next',
        imageUrl: APP_OG_IMAGE_URL,
        button: {
          title: 'explore poidh',
          action: {
            type: 'launch_frame',
            name: APP_NAME,
            url: `${APP_URL}/explore`,
            splashImageUrl: APP_SPLASH_URL,
            iconUrl: APP_ICON_URL,
            splashBackgroundColor: APP_SPLASH_BACKGROUND_COLOR,
          },
        },
      }),
    },
  } satisfies Metadata;
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
    return;
  }
}

function getSortedParticipants(
  participations: { amount: string; user_address: string }[]
): string[] {
  if (!participations?.length) return [];

  return [...participations]
    .sort(
      (a, b) =>
        Number(formatEther(BigInt(b.amount))) -
        Number(formatEther(BigInt(a.amount)))
    )
    .slice(0, 8)
    .map((p) => p.user_address); // limit number of participants to 8
}

function buildFrame({
  previewImageUrl,
  params,
}: {
  previewImageUrl: string;
  params: { id: string; netname: Netname };
}) {
  return {
    version: 'next',
    imageUrl: previewImageUrl,
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
