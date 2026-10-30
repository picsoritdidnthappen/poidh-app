import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import axios from 'axios';
import MarkdownContent from '@/components/global/MarkdownContent';
import DraftActions, { DraftAuthor } from '@/components/drafts/DraftActions';

export const runtime = 'nodejs';

type DraftPageProps = {
  params: Promise<{ cid: string }>;
};

const CID_PATTERN = /^b[a-z2-7]{30,120}$/;

// Use the exact public origin in sharing metadata. Avoid sending staging
// social crawlers to production, and never trust arbitrary Host headers.
async function getPublicOrigin() {
  const requestHeaders = await headers();
  const host = (
    requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host') ?? ''
  ).split(',')[0].trim().toLowerCase();
  return host === 'staging.poidh.xyz'
    ? 'https://staging.poidh.xyz'
    : 'https://poidh.xyz';
}

const draftSchema = z.object({
  type: z.literal('poidh-bounty-draft'),
  version: z.literal(1),
  creator: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(20000),
  amount: z.string().regex(/^\d+(?:\.\d{1,18})?$/),
  chain: z.enum(['mainnet', 'base', 'arbitrum']),
  isOpenBounty: z.boolean(),
  album: z.string().max(30),
  createdAt: z.string().datetime(),
});

const chainLabels = {
  mainnet: 'Ethereum Mainnet',
  base: 'Base',
  arbitrum: 'Arbitrum',
};

// Resolve immutable draft JSON on the server through poidh's dedicated Pinata
// gateway. The browser only receives the rendered page, not the gateway URL.
// Cache each successful result for 24 hours to reduce metered gateway traffic.
const getDraft = unstable_cache(
  async (cid: string) => {
    const gateway = process.env.PINATA_DRAFT_GATEWAY_URL?.trim();

    if (!gateway) {
      console.error('[bounty draft] gateway URL environment variable is missing');
      throw new Error('Draft gateway not configured');
    }

    // The gateway is configured by poidh, never supplied by the visitor.
    // The CID is validated before this function is called.
    const base = new URL(gateway);
    if (base.protocol !== 'https:') {
      throw new Error('Draft gateway must use HTTPS');
    }

    // Accept either https://gateway.mypinata.cloud or .../ipfs in the env var.
    const gatewayPath = base.pathname.replace(/\/+(?:ipfs)?\/?$/, '');
    const url = new URL(base.origin);
    url.pathname = `${gatewayPath}/ipfs/${cid}`;

    // Use Axios's Node HTTP adapter here instead of Next.js-patched fetch.
    // This avoids conflicting fetch cache policies inside unstable_cache,
    // while unstable_cache still caches validated JSON for 24 hours.
    let json: unknown;
    try {
      const response = await axios.get<string>(url.toString(), {
        adapter: 'http',
        responseType: 'text',
        timeout: 12000,
        maxContentLength: 30000,
        maxRedirects: 0,
        headers: {
          Accept: 'application/json',
        },
      });

      const raw = response.data;
      if (typeof raw !== 'string' || Buffer.byteLength(raw, 'utf8') > 30000) {
        return null;
      }

      try {
        json = JSON.parse(raw);
      } catch {
        console.warn('[bounty draft] gateway returned invalid JSON');
        return null;
      }
    } catch (error) {
      // Do not log the request/config: it includes the private gateway token.
      console.error('[bounty draft] gateway request failed:', {
        status: axios.isAxiosError(error) ? error.response?.status : undefined,
        code: axios.isAxiosError(error) ? error.code : undefined,
        message: error instanceof Error ? error.message : 'unknown error',
      });
      // Network, gateway and HTTP failures must not be cached as missing drafts.
      throw new Error('Draft gateway request failed');
    }

    const parsed = draftSchema.safeParse(json);
    if (!parsed.success) {
      console.warn('[bounty draft] invalid draft schema');
      return null;
    }

    return parsed.data;
  },
  ['poidh-bounty-draft-dedicated-gateway-v3'],
  { revalidate: 86400 }
);

// A gateway outage should not strip the social image entirely. This generic
// card is intentionally not tied to a draft's contents or author: those
// details cannot be trusted until its immutable JSON has loaded.
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
  if (!CID_PATTERN.test(cid)) return { title: 'bounty draft | poidh' };

  const origin = await getPublicOrigin();
  try {
    const draft = await getDraft(cid);
    if (!draft) return { title: 'bounty draft | poidh' };

    const draftUrl = `${origin}/d/${cid}`;
    const title = `${draft.title} (draft) | poidh`;
    const plainDescription = draft.description.replace(/\s+/g, ' ').trim();
    const description =
      `Reusable poidh bounty draft: ${plainDescription}`.slice(0, 200);

    // Images are generated independently of the IPFS gateway. The OG endpoint
    // receives only public fields from the already-validated, immutable JSON.
    // Farcaster limits embed image URLs to 1024 characters. Keep the encoded
    // dynamic image title comfortably below that even when it contains emoji.
    let imageTitle = '';
    for (const character of Array.from(draft.title)) {
      if (encodeURIComponent(imageTitle + character).length > 500) break;
      imageTitle += character;
    }
    if (imageTitle.length < draft.title.length) imageTitle += '…';

    const imageParams = new URLSearchParams({
      title: imageTitle,
      address: draft.creator.toLowerCase(),
    });
    const ogImage = `${origin}/api/og/draft?${imageParams.toString()}`;
    imageParams.set('format', 'farcaster');
    const farcasterImage = `${origin}/api/og/draft?${imageParams.toString()}`;

    // Matches the working /analytics Farcaster Mini App integration.
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
    // Temporary Pinata/network errors still produce a valid generic preview.
    // Do not claim to know the draft title or creator while data is unavailable.
    return fallbackMetadata(origin, cid);
  }
}

export default async function DraftPage({ params }: DraftPageProps) {
  const { cid } = await params;
  if (!CID_PATTERN.test(cid)) notFound();

  let draft: z.infer<typeof draftSchema> | null;
  try {
    draft = await getDraft(cid);
  } catch {
    return (
      <main className='layout py-16 text-white'>
        <div className='mx-auto max-w-3xl rounded-2xl border border-white/30 bg-blur p-6'>
          <h1 className='text-xl font-bold'>draft temporarily unavailable</h1>
          <p className='mt-3 text-white/80'>
            The draft could not be loaded right now. Please try again
            shortly.
          </p>
        </div>
      </main>
    );
  }

  if (!draft) notFound();

  return (
    <main className='layout py-10 md:py-16 text-white'>
      <div className='mx-auto max-w-5xl'>
        <div className='mb-5 flex flex-wrap items-center justify-between gap-3'>
          <span className='rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-semibold'>
            draft
          </span>
          <Link href='/' className='text-sm underline hover:text-white/80'>
            back to poidh
          </Link>
        </div>

        <section className='rounded-3xl border border-white/30 bg-blur p-5 sm:p-8'>
          <h1 className='break-words text-2xl font-bold sm:text-3xl'>
            {draft.title}
          </h1>

          <div className='mt-5 flex flex-wrap gap-2 text-sm'>
            <span className='rounded-md border border-white/25 bg-white/10 px-3 py-2'>
              {chainLabels[draft.chain]}
            </span>
            <span className='rounded-md border border-white/25 bg-white/10 px-3 py-2'>
              {draft.isOpenBounty ? 'open bounty' : 'solo bounty'}
            </span>
            {draft.album && (
              <span className='rounded-md border border-white/25 bg-white/10 px-3 py-2'>
                album: {draft.album}
              </span>
            )}
          </div>

          <div className='my-6 rounded-xl border border-white/20 bg-white/10 p-4'>
            <p className='text-xs text-white/70'>proposed starting reward</p>
            <p className='mt-1 text-2xl font-bold'>{draft.amount} ETH</p>
          </div>

          <h2 className='mb-3 border-b border-white/20 pb-2 text-lg font-semibold'>
            description
          </h2>
          <div className='min-w-0 break-words text-sm sm:text-base'>
            <MarkdownContent>{draft.description}</MarkdownContent>
          </div>

          <div className='mt-8 border-t border-white/20 pt-5 text-sm'>
            <p className='text-white/70'>draft author</p>
            <DraftAuthor address={draft.creator} />

            {/* Adjust spacing without changing DraftActions functionality. */}
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
              this is a reusable bounty draft. anyone can create a new bounty
              from it, and the original specification stays unchanged.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
