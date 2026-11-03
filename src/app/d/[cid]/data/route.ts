import axios from 'axios';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cid: string }> }
) {
  const { cid } = await params;

  // Drafts use IPFS CIDv1 identifiers.
  if (!/^b[a-z2-7]{20,100}$/.test(cid)) {
    return NextResponse.json(
      { error: 'Invalid draft CID' },
      { status: 400 }
    );
  }

  try {
  const gateway =
  process.env.PINATA_DRAFT_GATEWAY_URL?.trim() ||
  'https://gateway.pinata.cloud';

  const base = new URL(gateway);

  if (base.protocol !== 'https:') {
    throw new Error('Draft gateway must use HTTPS');
  }

  const gatewayPath = base.pathname.replace(/\/+(?:ipfs)?\/?$/, '');
  const url = new URL(base.origin);
  url.pathname = `${gatewayPath}/ipfs/${cid}`;

  const response = await axios.get(
    url.toString(),
      {
        timeout: 8000,
        maxContentLength: 30000,
        responseType: 'json',
      }
    );

    const draft = response.data;

    // Only expose valid poidh draft records.
    if (
      !draft ||
      typeof draft !== 'object' ||
      Array.isArray(draft) ||
      draft.type !== 'poidh-bounty-draft' ||
      draft.version !== 1
    ) {
      return NextResponse.json(
        { error: 'Draft not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ...draft,
        url: `${new URL(_request.url).origin}/d/${cid}`,
      },
      {
        headers: {
          'Cache-Control':
            'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 404
    ) {
      return NextResponse.json(
        { error: 'Draft not found' },
        { status: 404 }
      );
    }

    console.error('Draft data fetch failed:', error);

    return NextResponse.json(
      { error: 'Draft data temporarily unavailable' },
      { status: 502 }
    );
  }
}
