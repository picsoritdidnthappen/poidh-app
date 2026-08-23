import { chains } from '@/utils/config';
import { generateDynamicOGUrl } from '@/utils/og';
import { Netname } from '@/utils/types';
import { Metadata } from 'next';
import prisma from 'prisma/prisma';
import { formatEther } from 'viem';
import { trpcCaller } from '@/trpc/server';

const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL || 'https://poidh.xyz'
).replace(/\/$/, '');

const APP_ICON_URL = `${APP_URL}/icon.png`;
const APP_SPLASH_URL = `${APP_URL}/Logo_poidh.svg`;
const APP_SPLASH_BACKGROUND_COLOR = '#2a81d5';
const APP_OG_IMAGE_URL = `${APP_URL}/images/poidh-preview-hero-v2.png`;
const APP_NAME = 'poidh';

const DEFAULT_TITLE = "poidh - pics or it didn't happen";

const DEFAULT_DESCRIPTION =
  "poidh - pics or it didn't happen - fully onchain bounties + collectible NFTs - start your collection today on Arbitrum, Base, or Degen Chain";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

/**
 * Keep social descriptions reasonably sized.
 *
 * Large bounty descriptions can be thousands of characters long,
 * which is unnecessary for social crawlers and produces extremely
 * large metadata tags.
 */
function getSocialDescription(
  description: string | null | undefined,
  fallback = DEFAULT_DESCRIPTION
): string {
  if (!description) {
    return fallback;
  }

  const cleanDescription = description
    .replace(/\s+/g, ' ')
    .trim();

  if (cleanDescription.length <= 200) {
    return cleanDescription;
  }

  return `${cleanDescription.slice(0, 197)}...`;
}

/**
 * Ensures URLs used in metadata are absolute.
 */
function getAbsoluteUrl(url: string): string {
  try {
    return new URL(url, APP_URL).toString();
  } catch {
    return url;
  }
}

/**
 * Standard OpenGraph image object.
 *
 * Supplying dimensions, MIME type, and alt text removes ambiguity
 * for crawlers such as X/Twitter, Discord, Slack, etc.
 */
function getOgImage(
  url: string,
  alt: string
) {
  return {
    url: getAbsoluteUrl(url),
    width: OG_WIDTH,
    height: OG_HEIGHT,
    alt,
    type: 'image/png',
  };
}

export const generateMetadataForBounty = async ({
  params,
}: {
  params: {
    id: string;
    netname: Netname;
  };
}): Promise<Metadata> => {
  const chain =
    chains[params.netname as keyof typeof chains];

  const id = Number(params.id);

  const canonicalUrl =
    `${APP_URL}/${params.netname}/bounty/${params.id}`;

  const price: number | undefined =
    await trpcCaller.web3.fetchPrice({
      currency: chain.currency,
    });

  let bounty = null;

  if (!Number.isNaN(id)) {
    bounty = await prisma.bounties.findUnique({
      where: {
        id_chainId: {
          id,
          chainId: chain.id,
        },
      },
      include: {
        participations: {
          select: {
            amount: true,
            userAddress: true,
          },
        },
      },
    });
  }

  if (!bounty) {
    const frame = buildFrame({
      previewImageUrl: APP_OG_IMAGE_URL,
      params,
    });

    return {
      metadataBase: new URL(APP_URL),

      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,

      alternates: {
        canonical: canonicalUrl,
      },

      openGraph: {
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
        siteName: APP_NAME,
        url: canonicalUrl,
        images: [
          getOgImage(
            APP_OG_IMAGE_URL,
            'poidh - pics or it did not happen'
          ),
        ],
        type: 'website',
        locale: 'en_US',
      },

      twitter: {
        card: 'summary_large_image',
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
        images: [APP_OG_IMAGE_URL],
      },

      other: {
        'fc:frame': JSON.stringify(frame),
      },
    } satisfies Metadata;
  }

  const socialDescription =
    getSocialDescription(bounty.description);

  const bountyDataObject = {
    title: bounty.title.slice(0, 100),
    amount: bounty.amount,
    chainId: chain.id,
    currencyRate: price,
    participants: getSortedParticipants(
      bounty.participations
    ),
  };

  /**
   * Generate these URLs once and reuse them everywhere.
   *
   * This ensures OpenGraph and Twitter see the exact same
   * canonical OG image URL.
   */
  const ogImageUrl = getAbsoluteUrl(
    generateDynamicOGUrl({
      type: 'bounty',
      dataObject: bountyDataObject,
    })
  );

  const previewImageUrl = getAbsoluteUrl(
    generateDynamicOGUrl({
      type: 'bounty',
      dataObject: bountyDataObject,
      imageFormat: 'preview',
    })
  );

  const frame = buildFrame({
    previewImageUrl,
    params,
  });

  return {
    metadataBase: new URL(APP_URL),

    title: bounty.title,
    description: socialDescription,

    alternates: {
      canonical: canonicalUrl,
    },

    openGraph: {
      title: bounty.title,
      description: socialDescription,
      siteName: APP_NAME,
      url: canonicalUrl,
      images: [
        getOgImage(
          ogImageUrl,
          `${bounty.title} on poidh`
        ),
      ],
      type: 'website',
      locale: 'en_US',
    },

    twitter: {
      card: 'summary_large_image',
      title: bounty.title,
      description: socialDescription,
      images: [ogImageUrl],
    },

    other: {
      'fc:frame': JSON.stringify(frame),
    },
  } satisfies Metadata;
};

export const generateMetadataForAccountPage = async ({
  params,
}: {
  params: {
    address: string;
  };
}): Promise<Metadata> => {
  const address = params.address;

  const canonicalUrl =
    `${APP_URL}/account/${address}`;

  const fallbackTitle =
    `Account ${address}`;

  const fallbackDescription =
    `Account ${address} details`;

  const frame = {
    version: 'next',
    imageUrl: APP_OG_IMAGE_URL,
    button: {
      title: 'view profile',
      action: {
        type: 'launch_frame',
        name: 'view profile',
        url: canonicalUrl,
        splashImageUrl: APP_SPLASH_URL,
        iconUrl: APP_ICON_URL,
        splashBackgroundColor:
          APP_SPLASH_BACKGROUND_COLOR,
      },
    },
  };

  try {
    const split =
      await trpcCaller.accounts.stats({
        address,
      });

    const accountActivitiesCount =
      await trpcCaller.accounts.activitiesCount({
        address,
      });

    const accountDataObject = {
      address,
      chain: 'base',
      poidhScore: split.poidhScore,
      totalBounties:
        accountActivitiesCount.bounties,
      totalClaims:
        accountActivitiesCount.claims,
    };

    const ogImageUrl = getAbsoluteUrl(
      generateDynamicOGUrl({
        type: 'account',
        dataObject: accountDataObject,
      })
    );

    const previewImageUrl = getAbsoluteUrl(
      generateDynamicOGUrl({
        type: 'account',
        dataObject: accountDataObject,
        imageFormat: 'preview',
      })
    );

    frame.imageUrl = previewImageUrl;

    return {
      metadataBase: new URL(APP_URL),

      title: fallbackTitle,
      description: fallbackDescription,

      alternates: {
        canonical: canonicalUrl,
      },

      openGraph: {
        title: fallbackTitle,
        description: fallbackDescription,
        siteName: APP_NAME,
        url: canonicalUrl,
        images: [
          getOgImage(
            ogImageUrl,
            `${fallbackTitle} on poidh`
          ),
        ],
        type: 'website',
        locale: 'en_US',
      },

      twitter: {
        card: 'summary_large_image',
        title: fallbackTitle,
        description: fallbackDescription,
        images: [ogImageUrl],
      },

      other: {
        'fc:frame': JSON.stringify(frame),
      },
    } satisfies Metadata;
  } catch {
    return {
      metadataBase: new URL(APP_URL),

      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,

      alternates: {
        canonical: canonicalUrl,
      },

      openGraph: {
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
        siteName: APP_NAME,
        url: canonicalUrl,
        images: [
          getOgImage(
            APP_OG_IMAGE_URL,
            'poidh - pics or it did not happen'
          ),
        ],
        type: 'website',
        locale: 'en_US',
      },

      twitter: {
        card: 'summary_large_image',
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
        images: [APP_OG_IMAGE_URL],
      },

      other: {
        'fc:frame': JSON.stringify(frame),
      },
    } satisfies Metadata;
  }
};

export const generateMetadataForLeaderboardPage =
  (): Metadata => {
    const title =
      "poidh leaderboard - pics or it didn't happen";

    const description =
      "view the top performers on poidh - see who's leading in bounty completions and earnings across all chains";

    const canonicalUrl =
      `${APP_URL}/leaderboard`;

    return {
      metadataBase: new URL(APP_URL),

      title,
      description,

      alternates: {
        canonical: canonicalUrl,
      },

      openGraph: {
        title,
        description,
        siteName: APP_NAME,
        url: canonicalUrl,
        images: [
          getOgImage(
            APP_OG_IMAGE_URL,
            'poidh leaderboard'
          ),
        ],
        type: 'website',
        locale: 'en_US',
      },

      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [APP_OG_IMAGE_URL],
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
              url: canonicalUrl,
              splashImageUrl:
                APP_SPLASH_URL,
              iconUrl: APP_ICON_URL,
              splashBackgroundColor:
                APP_SPLASH_BACKGROUND_COLOR,
            },
          },
        }),
      },
    } satisfies Metadata;
  };

export const generateMetadataForAlbumPage = ({
  params,
}: {
  params: {
    album: string;
  };
}): Metadata => {
  const title =
    `${params.album} bounties on poidh`;

  const description =
    `view ${params.album} bounties on poidh - see all current bounties, view all past bounties, or create a new bounty within the ${params.album} album`;

  const canonicalUrl =
    `${APP_URL}/a/${params.album}`;

  const ogImageUrl =
    `${APP_URL}/api/og/album?album=${encodeURIComponent(
      params.album
    )}&imageFormat=og`;

  const previewImageUrl =
    `${APP_URL}/api/og/album?album=${encodeURIComponent(
      params.album
    )}&imageFormat=preview`;

  return {
    metadataBase: new URL(APP_URL),

    title,
    description,

    alternates: {
      canonical: canonicalUrl,
    },

    openGraph: {
      title,
      description,
      siteName: APP_NAME,
      url: canonicalUrl,
      images: [
        getOgImage(
          ogImageUrl,
          `${params.album} bounties on poidh`
        ),
        getOgImage(
          APP_OG_IMAGE_URL,
          'poidh'
        ),
      ],
      type: 'website',
      locale: 'en_US',
    },

    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },

    other: {
      'fc:frame': JSON.stringify({
        version: 'next',
        imageUrl: previewImageUrl,
        button: {
          title,
          action: {
            type: 'launch_frame',
            name: 'view album',
            url: canonicalUrl,
            splashImageUrl:
              APP_SPLASH_URL,
            iconUrl: APP_ICON_URL,
            splashBackgroundColor:
              APP_SPLASH_BACKGROUND_COLOR,
          },
        },
      }),
    },
  } satisfies Metadata;
};

export const generateMetadaForFeedPage =
  (): Metadata => {
    const title =
      'poidh feed - view activity as it happens';

    const description =
      'view the complete poidh activity feed - see new bounties, new claims, and winner announcements as they happen';

    const canonicalUrl = `${APP_URL}/feed`;

    return {
      metadataBase: new URL(APP_URL),

      title,
      description,

      alternates: {
        canonical: canonicalUrl,
      },

      openGraph: {
        title,
        description,
        siteName: APP_NAME,
        url: canonicalUrl,
        images: [
          getOgImage(
            APP_OG_IMAGE_URL,
            'poidh activity feed'
          ),
        ],
        type: 'website',
        locale: 'en_US',
      },

      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [APP_OG_IMAGE_URL],
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
              url: canonicalUrl,
              splashImageUrl:
                APP_SPLASH_URL,
              iconUrl: APP_ICON_URL,
              splashBackgroundColor:
                APP_SPLASH_BACKGROUND_COLOR,
            },
          },
        }),
      },
    } satisfies Metadata;
  };

export const generateMetadaForExplorePage =
  (): Metadata => {
    const title =
      'explore poidh bounties & albums';

    const description =
      'search poidh bounties and albums by keyword - from silly meme contests to robust public goods funding, poidh has content across a diverse range of topics';

    const canonicalUrl = `${APP_URL}/explore`;

    return {
      metadataBase: new URL(APP_URL),

      title,
      description,

      alternates: {
        canonical: canonicalUrl,
      },

      openGraph: {
        title,
        description,
        siteName: APP_NAME,
        url: canonicalUrl,
        images: [
          getOgImage(
            APP_OG_IMAGE_URL,
            'explore poidh'
          ),
        ],
        type: 'website',
        locale: 'en_US',
      },

      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [APP_OG_IMAGE_URL],
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
              url: canonicalUrl,
              splashImageUrl:
                APP_SPLASH_URL,
              iconUrl: APP_ICON_URL,
              splashBackgroundColor:
                APP_SPLASH_BACKGROUND_COLOR,
            },
          },
        }),
      },
    } satisfies Metadata;
  };

function getSortedParticipants(
  participations: {
    amount: string;
    userAddress: string;
  }[]
): string[] {
  if (!participations?.length) {
    return [];
  }

  return [...participations]
    .sort(
      (a, b) =>
        Number(
          formatEther(BigInt(b.amount))
        ) -
        Number(
          formatEther(BigInt(a.amount))
        )
    )
    .slice(0, 8)
    .map((p) => p.userAddress);
}

function buildFrame({
  previewImageUrl,
  params,
}: {
  previewImageUrl: string;
  params: {
    id: string;
    netname: Netname;
  };
}) {
  return {
    version: 'next',
    imageUrl: getAbsoluteUrl(
      previewImageUrl
    ),
    button: {
      title: 'view bounty',
      action: {
        type: 'launch_frame',
        name: APP_NAME,
        url: `${APP_URL}/${params.netname}/bounty/${params.id}`,
        splashImageUrl: APP_SPLASH_URL,
        iconUrl: APP_ICON_URL,
        splashBackgroundColor:
          APP_SPLASH_BACKGROUND_COLOR,
      },
    },
  };
}
