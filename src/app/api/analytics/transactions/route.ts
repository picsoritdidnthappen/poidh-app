import { NextRequest, NextResponse } from 'next/server';
import prisma from 'prisma/prisma';
import { actionGroup, chainFor, uniqueTransactions } from '@/poidhAnalytics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function validDay(input: string | null): input is string {
  if (!input || !/^\d{4}-\d{2}-\d{2}$/.test(input)) return false;
  return !Number.isNaN(Date.parse(`${input}T00:00:00.000Z`)) &&
    new Date(`${input}T00:00:00.000Z`).toISOString().slice(0, 10) === input;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const from = params.get('from');
  const to = params.get('to') || from;
  const chain = params.get('chain');
  const group = params.get('group');
  const offset = Number(params.get('offset') || '0');
  if (!validDay(from) || !validDay(to) || from < '2026-01-01' || to < from ||
      Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`) > 6 * 86400000 ||
      (chain !== null && ![1, 42161, 8453].includes(Number(chain))) ||
      (group !== null && !['claims', 'bounties', 'funding', 'voting', 'accepted', 'other'].includes(group)) ||
      !Number.isSafeInteger(offset) || offset < 0 || offset > 100000) {
    return NextResponse.json({ error: 'Invalid analytics filters' }, { status: 400 });
  }
  const start = Math.floor(Date.parse(`${from}T00:00:00Z`) / 1000);
  const exclusiveEnd = Math.floor(Date.parse(`${to}T00:00:00Z`) / 1000) + 86400;
  try {
    const rows = await prisma.transactions.findMany({
      where: {
        timestamp: { gte: start.toString(), lt: exclusiveEnd.toString() },
        OR: [
          { chainId: 1 },
          { chainId: 42161, bountyId: { gte: 180 } },
          { chainId: 8453, bountyId: { gte: 986 } },
        ],
        ...(chain === null ? {} : { chainId: Number(chain) }),
      },
      select: {
        tx: true,
        index: true,
        chainId: true,
        bountyId: true,
        action: true,
        timestamp: true,
        bounty: { select: { title: true } },
      },
    });
    const unique = uniqueTransactions(rows)
      .filter((tx) => !group || actionGroup(tx.action) === group)
      .sort((a, b) => Number(b.timestamp.toString()) - Number(a.timestamp.toString()));
    const PAGE_SIZE = 100;
    const items = unique.slice(offset, offset + PAGE_SIZE).map((tx) => {
      const network = chainFor(tx.chainId)!;
      return {
        tx: tx.tx,
        timestamp: Number(tx.timestamp.toString()),
        chainId: tx.chainId,
        chain: network.label,
        action: tx.action,
        group: actionGroup(tx.action),
        bountyId: tx.bountyId,
        title: tx.bounty?.title || `Bounty #${tx.bountyId}`,
        explorerUrl: `${network.explorer}${tx.tx}`,
        bountyUrl: `/${network.slug}/bounty/${tx.bountyId}`,
      };
    });
    return NextResponse.json({ items, total: unique.length, hasMore: offset + PAGE_SIZE < unique.length }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=300' },
    });
  } catch (error) {
    console.error('poidh analytics details error', error);
    return NextResponse.json({ error: 'Unable to load transaction details right now.' }, {
      status: 503, headers: { 'Cache-Control': 'no-store' },
    });
  }
}
