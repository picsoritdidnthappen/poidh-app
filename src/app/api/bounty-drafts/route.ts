import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createContext } from '@/trpc/context';

export const runtime = 'nodejs';

const allowedOrigins = [
  'https://poidh.xyz',
  'https://staging.poidh.xyz',
];

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

const draftSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(20000),
    amount: z
      .string()
      .max(50)
      .regex(/^\d+(?:\.\d{1,18})?$/)
      .refine((value) => Number(value) > 0 && Number.isFinite(Number(value))),
    chain: z.enum(['mainnet', 'base', 'arbitrum']),
    isOpenBounty: z.boolean(),
    album: z
      .string()
      .max(30)
      .refine(
        (value) => !value || /^[a-z]+(?:-[a-z]+)*$/.test(value)
      ),
  })
  .strict();

// Save a new draft.
export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin');
    const fetchSite = request.headers.get('sec-fetch-site');

    if (
      !origin ||
      !allowedOrigins.includes(origin) ||
      (fetchSite && fetchSite !== 'same-origin')
    ) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    if (
      !request.headers
        .get('content-type')
        ?.includes('application/json')
    ) {
      return NextResponse.json(
        { error: 'Expected JSON' },
        { status: 415 }
      );
    }

    // Verify the actual wallet owner using poidh's session.
    const ctx = await createContext();
    const session = await ctx.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Sign in with your wallet to save a draft' },
        { status: 401 }
      );
    }

    const creator = addressSchema.safeParse(session.address);

    if (!creator.success) {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      );
    }

    const contentLength = Number(
      request.headers.get('content-length') ?? 0
    );

    if (contentLength > 30000) {
      return NextResponse.json(
        { error: 'Draft is too large' },
        { status: 413 }
      );
    }

    const raw = await request.text();

    if (raw.length > 30000) {
      return NextResponse.json(
        { error: 'Draft is too large' },
        { status: 413 }
      );
    }

    let input: unknown;

    try {
      input = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    const parsed = draftSchema.safeParse(input);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid bounty draft' },
        { status: 400 }
      );
    }

    const jwt = process.env.PINATA_JWT?.trim();

    if (!jwt) {
      return NextResponse.json(
        { error: 'Draft storage is not configured' },
        { status: 503 }
      );
    }

    const wallet = creator.data.toLowerCase();

    // Portable, content-addressed bounty specification.
    const draft = {
      type: 'poidh-bounty-draft',
      version: 1,
      creator: wallet,
      ...parsed.data,
      createdAt: new Date().toISOString(),
    };

    const response = await fetch(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pinataContent: draft,
          pinataOptions: {
            cidVersion: 1,
          },
          pinataMetadata: {
            name: 'poidh-bounty-draft',
            keyvalues: {
              type: 'bounty-draft',
              creator: wallet,
              title: parsed.data.title,
              chain: parsed.data.chain,
              amount: parsed.data.amount,
            },
          },
        }),
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      console.error('Pinata draft upload failed:', response.status);
      return NextResponse.json(
        { error: 'Failed to save draft' },
        { status: 502 }
      );
    }

    const result = (await response.json()) as {
      IpfsHash?: unknown;
    };

    if (
      typeof result.IpfsHash !== 'string' ||
      !/^[a-zA-Z0-9]+$/.test(result.IpfsHash)
    ) {
      return NextResponse.json(
        { error: 'Invalid IPFS response' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      cid: result.IpfsHash,
      url: `/d/${result.IpfsHash}`,
    });
  } catch {
    return NextResponse.json(
      { error: 'Unable to save draft' },
      { status: 500 }
    );
  }
}

// Retrieve drafts associated with a wallet.
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = addressSchema.safeParse(
      url.searchParams.get('creator')
    );

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      );
    }

    const offset = Number(url.searchParams.get('offset') ?? '0');

    if (
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      offset > 100000
    ) {
      return NextResponse.json(
        { error: 'Invalid offset' },
        { status: 400 }
      );
    }

    const jwt = process.env.PINATA_DRAFTS_READ_JWT?.trim();

    if (!jwt) {
      return NextResponse.json(
        { error: 'Draft search is not configured' },
        { status: 503 }
      );
    }

    const creator = parsed.data.toLowerCase();
    const pageLimit = 20;

    const pinataUrl = new URL(
      'https://api.pinata.cloud/data/pinList'
    );

    pinataUrl.searchParams.set('status', 'pinned');
    pinataUrl.searchParams.set('pageLimit', String(pageLimit));
    pinataUrl.searchParams.set('pageOffset', String(offset));
    pinataUrl.searchParams.set(
      'metadata',
      JSON.stringify({
        name: 'poidh-bounty-draft',
        keyvalues: {
          type: {
            value: 'bounty-draft',
            op: 'eq',
          },
          creator: {
            value: creator,
            op: 'eq',
          },
        },
      })
    );

    const response = await fetch(pinataUrl.toString(), {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('Pinata draft lookup failed:', response.status);
      return NextResponse.json(
        { error: 'Failed to retrieve drafts' },
        { status: 502 }
      );
    }

    const result = (await response.json()) as {
      rows?: Array<{
        ipfs_pin_hash: string;
        date_pinned: string;
        metadata?: {
          keyvalues?: Record<string, string>;
        };
      }>;
    };

    if (!Array.isArray(result.rows)) {
      return NextResponse.json(
        { error: 'Invalid draft lookup response' },
        { status: 502 }
      );
    }

    const drafts = result.rows
      .filter(
        (row) =>
          row.metadata?.keyvalues?.type === 'bounty-draft' &&
          row.metadata?.keyvalues?.creator === creator
      )
      .map((row) => ({
        cid: row.ipfs_pin_hash,
        url: `/d/${row.ipfs_pin_hash}`,
        title: row.metadata?.keyvalues?.title ?? '',
        chain: row.metadata?.keyvalues?.chain ?? '',
        amount: row.metadata?.keyvalues?.amount ?? '',
        createdAt: row.date_pinned,
      }));

    return NextResponse.json({
      drafts,
      nextOffset:
        result.rows.length === pageLimit
          ? offset + pageLimit
          : null,
    });
  } catch {
    return NextResponse.json(
      { error: 'Unable to retrieve drafts' },
      { status: 500 }
    );
  }
}
