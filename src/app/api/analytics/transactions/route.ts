import { NextRequest, NextResponse } from 'next/server';
import prisma from 'prisma/prisma';
import { actionGroup, chainFor } from '@/poidhAnalytics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 100;

type TransactionRow = {
  tx: string;
  chainId: number;
  bountyId: number;
  action: string;
  timestamp: { toString(): string };
  title: string | null;
  total: number;
};

function validDay(input: string | null): input is string {
  if (!input || !/^\d{4}-\d{2}-\d{2}$/.test(input)) return false;
  const time = Date.parse(`${input}T00:00:00.000Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === input;
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
  const selectedChain = chain === null ? null : Number(chain);

  try {
    // Deduplicate and paginate in PostgreSQL. No unbounded findMany() result
    // is ever transferred to Node just because someone clicks a chart date.
    const rows = await prisma.$queryRaw<TransactionRow[]>`
      WITH first_event AS (
        SELECT DISTINCT ON (t.chain_id, LOWER(t.tx))
          t.tx, t.chain_id, t.bounty_id, t.action, t.timestamp, t."index"
        FROM "Transactions" t
        WHERE t.timestamp >= ${start.toString()}::numeric
          AND t.timestamp < ${exclusiveEnd.toString()}::numeric
          AND (
            t.chain_id = 1 OR
            (t.chain_id = 42161 AND t.bounty_id >= 180) OR
            (t.chain_id = 8453 AND t.bounty_id >= 986)
          )
          AND (${selectedChain}::integer IS NULL OR t.chain_id = ${selectedChain}::integer)
        ORDER BY t.chain_id, LOWER(t.tx), t."index" ASC
      ), classified AS (
        SELECT e.*,
          CASE
            WHEN LOWER(TRIM(e.action)) = 'claim created' THEN 'claims'
            WHEN LOWER(TRIM(e.action)) IN ('bounty created', 'bounty canceled') THEN 'bounties'
            WHEN LOWER(TRIM(e.action)) = 'claim accepted' THEN 'accepted'
            WHEN LOWER(TRIM(e.action)) = 'funding'
              OR LOWER(TRIM(e.action)) = 'funds claimed'
              OR LOWER(TRIM(e.action)) ~ '^[+-][0-9.]+ eth$' THEN 'funding'
            WHEN LOWER(TRIM(e.action)) IN ('voted', 'voting resolved')
              OR LOWER(TRIM(e.action)) LIKE '%submitted for vote' THEN 'voting'
            ELSE 'other'
          END AS action_group
        FROM first_event e
      )
      SELECT c.tx,
             c.chain_id AS "chainId",
             c.bounty_id AS "bountyId",
             c.action,
             c.timestamp,
             b.title,
             COUNT(*) OVER()::integer AS total
      FROM classified c
      LEFT JOIN "Bounties" b
        ON b.id = c.bounty_id AND b.chain_id = c.chain_id
      WHERE (${group}::text IS NULL OR c.action_group = ${group}::text)
      ORDER BY c.timestamp DESC, c.chain_id ASC, c.tx ASC
      LIMIT ${PAGE_SIZE} OFFSET ${offset}
    `;

    const items = rows.map((tx) => {
      const network = chainFor(tx.chainId)!;
      return {
        tx: tx.tx,
        timestamp: Number(tx.timestamp.toString()),
        chainId: tx.chainId,
        chain: network.label,
        action: tx.action,
        group: actionGroup(tx.action),
        bountyId: tx.bountyId,
        title: tx.title || `Bounty #${tx.bountyId}`,
        explorerUrl: `${network.explorer}${tx.tx}`,
        bountyUrl: `/${network.slug}/bounty/${tx.bountyId}`,
      };
    });
    const total = rows.length ? rows[0].total : 0;
    return NextResponse.json({ items, total, hasMore: offset + PAGE_SIZE < total }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=300' },
    });
  } catch (error) {
    console.error('poidh analytics details error', error);
    return NextResponse.json({ error: 'Unable to load transaction details right now.' }, {
      status: 503, headers: { 'Cache-Control': 'no-store' },
    });
  }
}
