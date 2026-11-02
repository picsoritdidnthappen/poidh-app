import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const PAGE_SIZE = 20;
const CID_PATTERN = /^b[a-z2-7]{30,120}$/;
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

type PinRow = {
  ipfs_pin_hash?: unknown;
  date_pinned?: unknown;
  metadata?: {
    name?: unknown;
    keyvalues?: Record<string, unknown>;
  };
};

// Public discovery of saved draft metadata. The Pinata JWT is server-only.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const offsetParam = url.searchParams.get('offset') ?? '0';
  const offset = Number(offsetParam);

  if (!/^\d+$/.test(offsetParam) || !Number.isSafeInteger(offset) || offset > 100000) {
    return NextResponse.json({ error: 'Invalid offset' }, { status: 400 });
  }

  const jwt = process.env.PINATA_DRAFTS_READ_JWT?.trim();
  if (!jwt) {
    console.error('Recent drafts: Pinata read JWT is not configured');
    return NextResponse.json(
      { error: 'Recent drafts temporarily unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const pinataUrl = new URL('https://api.pinata.cloud/data/pinList');
  pinataUrl.searchParams.set('status', 'pinned');
  pinataUrl.searchParams.set('pageLimit', String(PAGE_SIZE));
  pinataUrl.searchParams.set('pageOffset', String(offset));
  pinataUrl.searchParams.set(
    'metadata',
    JSON.stringify({
      name: 'poidh-bounty-draft',
      keyvalues: { type: { value: 'bounty-draft', op: 'eq' } },
    })
  );

  try {
    const response = await fetch(pinataUrl.toString(), {
      headers: { Authorization: `Bearer ${jwt}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.error('Recent drafts: Pinata lookup failed', response.status);
      return NextResponse.json(
        { error: 'Failed to retrieve recent drafts' },
        { status: 502, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const result = (await response.json()) as { rows?: PinRow[] };
    if (!Array.isArray(result.rows)) {
      return NextResponse.json(
        { error: 'Invalid Pinata response' },
        { status: 502, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const drafts = result.rows.flatMap((row) => {
      const metadata = row.metadata;
      const values = metadata?.keyvalues;
      const cid = row.ipfs_pin_hash;
      const createdAt = row.date_pinned;
      const creator = values?.creator;
      const title = values?.title;
      const chain = values?.chain;
      const amount = values?.amount;

      if (
        metadata?.name !== 'poidh-bounty-draft' ||
        values?.type !== 'bounty-draft' ||
        typeof cid !== 'string' || !CID_PATTERN.test(cid) ||
        typeof creator !== 'string' || !ADDRESS_PATTERN.test(creator) ||
        typeof title !== 'string' || !title.trim() ||
        (chain !== 'mainnet' && chain !== 'base' && chain !== 'arbitrum') ||
        typeof amount !== 'string' ||
        typeof createdAt !== 'string' || !Number.isFinite(Date.parse(createdAt))
      ) return [];

      return [{
        cid,
        url: `/d/${cid}`,
        creator: creator.toLowerCase(),
        title,
        chain,
        amount,
        currency: 'ETH' as const,
        createdAt,
        status: 'draft' as const,
      }];
    }).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

    return NextResponse.json(
      {
        drafts,
        nextOffset: result.rows.length === PAGE_SIZE ? offset + PAGE_SIZE : null,
      },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60' } }
    );
  } catch (error) {
    console.error('Recent drafts: lookup error', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Recent drafts temporarily unavailable' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
