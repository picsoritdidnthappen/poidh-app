import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import MarkdownContent from '@/components/global/MarkdownContent';
import DraftActions, { DraftAuthor } from '@/components/drafts/DraftActions';
import DraftDiscussion from '@/components/ideas/DraftDiscussion';
import { CID_PATTERN, getVerifiedDraft } from '@/utils/draftAuthenticity';

export const runtime = 'nodejs';

type DraftPageProps = {
  params: Promise<{ cid: string }>;
};

// Use the exact public origin in sharing metadata.
// Avoid sending staging social crawlers to production.
async function getPublicOrigin() {
  const requestHeaders = await headers();

  const host = (
    requestHeaders.get('x-forwarded-host') ??
    requestHeaders.get('host') ??
    ''
  )
    .split(',')[0]
    .trim()
    .toLowerCase();

  return host === 'staging.poidh.xyz'
    ? 'https://staging.poidh.xyz'
    : 'https://poidh.xyz';
}

const chainLabels = {
  mainnet: 'Ethereum Mainnet',
  base: 'Base',
  arbitrum: 'Arbitrum',
};

function fallbackMetadata(origin: string, cid: string): Metadata {
  const draftUrl = `${origin}/d/${cid}`;
  const imageUrl = `${origin}/api/og/draft?title=bounty+draft`;
  const title = 'bounty draft | poidh';
  const description = 'Reusable bounty draft on poidh.';

  return {
    metadataBase: new URL(origin),
    title,
    description,
    alternates: { canonical: draftUrl },
    openGraph: {
      type: 'website',
      url: draftUrl,
      siteName: 'poidh',
      title,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: 'poidh bounty draft',
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export async function generateMetadata({
  params,
}: DraftPageProps): Promise<Metadata> {
  const { cid } = await params;

  if (!CID_PATTERN.test(cid)) {
    return { title: 'bounty draft | poidh' };
  }

  const origin = await getPublicOrigin();

  try {
    const draft = await getVerifiedDraft(cid, null);

    if (!draft) {
      return { title: 'bounty draft | poidh' };
    }

    const draftUrl = `${origin}/d/${cid}`;
    const title = `${draft.title} (draft) | poidh`;

    const plainDescription = draft.description
      .replace(/\s+/g, ' ')
      .trim();

    const description =
      `Reusable poidh bounty draft: ${plainDescription}`.slice(0, 200);

    // Keep Farcaster image URLs within supported length limits.
    let imageTitle = '';

    for (const character of Array.from(draft.title)) {
      if (
        encodeURIComponent(imageTitle + character).length > 500
      ) {
        break;
      }

      imageTitle += character;
    }

    if (imageTitle.length < draft.title.length) {
      imageTitle += '…';
    }

    const imageParams = new URLSearchParams({
      title: imageTitle,
      address: draft.creator.toLowerCase(),
    });

    const ogImage =
      `${origin}/api/og/draft?${imageParams.toString()}`;

    imageParams.set('format', 'farcaster');

    const farcasterImage =
      `${origin}/api/og/draft?${imageParams.toString()}`;

    const miniAppEmbed = {
      version: '1',
      imageUrl: farcasterImage,
      button: {
        title: 'create bounty',
        action: {
          type: 'launch_frame',
          name: 'poidh',
          url: draftUrl,
          splashImageUrl: `${origin}/mini-splash-v2.png`,
          splashBackgroundColor: '#6faae1',
        },
      },
    };

    return {
      metadataBase: new URL(origin),
      title,
      description,
      alternates: { canonical: draftUrl },
      openGraph: {
        type: 'website',
        url: draftUrl,
        siteName: 'poidh',
        title,
        description,
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: `${draft.title} — reusable poidh bounty draft`,
            type: 'image/png',
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImage],
      },
      other: {
        'fc:miniapp': JSON.stringify(miniAppEmbed),
        'fc:frame': JSON.stringify(miniAppEmbed),
      },
    };
  } catch {
    return fallbackMetadata(origin, cid);
  }
}

export default async function DraftPage({
  params,
}: DraftPageProps) {
  const { cid } = await params;

  if (!CID_PATTERN.test(cid)) {
    notFound();
  }

  let draft: Awaited<ReturnType<typeof getVerifiedDraft>>;

  try {
    draft = await getVerifiedDraft(cid, null);
  } catch {
    return (
      <main className='layout py-16 text-white'>
        <div className='mx-auto max-w-3xl rounded-2xl border border-white/30 bg-blur p-6'>
          <h1 className='text-xl font-bold'>
            draft temporarily unavailable
          </h1>
          <p className='mt-3 text-white/80'>
            The draft could not be loaded right now.
            Please try again shortly.
          </p>
        </div>
      </main>
    );
  }

  if (!draft) {
    notFound();
  }

  return (
    <main className='layout py-10 md:py-16 text-white'>
      <div className='mx-auto max-w-5xl'>
        <div className='mb-5 flex flex-wrap items-center justify-between gap-3'>
          <span className='rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-semibold'>
            draft
          </span>

          <Link
            href='/ideas'
            className='text-sm underline hover:text-white/80'
          >
            back to ideas
          </Link>
        </div>

        <section className='rounded-3xl border border-white/30 bg-blur p-5 sm:p-8'>
          <h1 className='break-words text-2xl font-bold normal-case sm:text-3xl'>
            {draft.title}
          </h1>

          <div className='mt-5 flex flex-wrap gap-2 text-sm'>
            <span className='rounded-md border border-white/25 bg-white/10 px-3 py-2'>
              {chainLabels[draft.chain]}
            </span>

            <span className='rounded-md border border-white/25 bg-white/10 px-3 py-2'>
              {draft.isOpenBounty
                ? 'open bounty'
                : 'solo bounty'}
            </span>

            {draft.album && (
              <span className='rounded-md border border-white/25 bg-white/10 px-3 py-2'>
                album: {draft.album}
              </span>
            )}
          </div>

          <div className='my-6 rounded-xl border border-white/20 bg-white/10 p-4'>
            <p className='text-xs text-white/70'>
              proposed starting reward
            </p>

            <p className='mt-1 text-2xl font-bold'>
              {draft.amount} ETH
            </p>
          </div>

          <h2 className='mb-3 border-b border-white/20 pb-2 text-lg font-semibold'>
            description
          </h2>

          <div className='min-w-0 break-words text-sm normal-case sm:text-base [&_*]:normal-case'>
            <MarkdownContent>
              {draft.description}
            </MarkdownContent>
          </div>

          <div className='mt-8 border-t border-white/20 pt-5 text-sm'>
            <p className='text-white/70'>
              draft author
            </p>

            <DraftAuthor address={draft.creator} />

            <div className='[&>div:first-child]:!mt-3 [&>p]:!mt-6'>
              <DraftActions
                draft={{
                  title: draft.title,
                  description: draft.description,
                  amount: draft.amount,
                  chain: draft.chain,
                  isOpenBounty: draft.isOpenBounty,
                  album: draft.album,
                }}
              />
            </div>

            <p className='mt-3 text-xs text-white/70'>
              this is a reusable bounty draft.
              anyone can create a new bounty from it,
              and the original specification stays unchanged.
            </p>
          </div>
        </section>

        {/* Idea voting and threaded discussion */}
        <DraftDiscussion cid={cid} />
      </div>
    </main>
  );
}
