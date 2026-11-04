import { NextResponse } from 'next/server';
import { CID_PATTERN, getVerifiedDraft } from '@/utils/draftAuthenticity';

export const runtime = 'nodejs';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ cid: string }> }
) {
  const { cid } = await params;
  if (!CID_PATTERN.test(cid)) {
    return NextResponse.json({ error: 'Invalid draft CID' }, { status: 400 });
  }

  try {
    const origin = new URL(request.url).origin;
    const draft = getVerifiedDraft(cid, null);
    if (!draft) {
      return NextResponse.json({ error: 'Draft not found' }, {
        status: 404,
        headers: { 'Cache-Control': 'public, s-maxage=60' },
      });
    }
    const { type, version, creator, title, description, amount, chain, isOpenBounty, album, createdAt, authorization } = draft;
    return NextResponse.json(
      { type, version, creator, title, description, amount, chain, isOpenBounty, album, createdAt, authorization, url: `${origin}/d/${cid}` },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
    );
  } catch {
    console.error('Draft data fetch failed');
    return NextResponse.json({ error: 'Draft data temporarily unavailable' }, { status: 502 });
  }
}
