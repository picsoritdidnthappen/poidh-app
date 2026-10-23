import { NextResponse } from 'next/server';
import prisma from 'prisma/prisma';
import {
  aggregateGroupedAnalytics,
  ANALYTICS_START_TIMESTAMP,
  type GroupedTransactionCount,
} from '@/poidhAnalytics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Query poidh's existing indexer-backed PostgreSQL database.
    // Aggregate in PostgreSQL rather than loading every event into Node.
    // One transaction is counted once per chain, even if it emitted
    // multiple indexed events. The first event determines the action group.
    const rows = await prisma.$queryRaw<GroupedTransactionCount[]>`
      WITH first_event AS (
        SELECT DISTINCT ON (t.chain_id, LOWER(t.tx))
          t.chain_id, t.action, t.timestamp
        FROM "Transactions" t
        WHERE t.timestamp >= ${ANALYTICS_START_TIMESTAMP}::numeric
          AND (
            t.chain_id = 1 OR
            (t.chain_id = 42161 AND t.bounty_id >= 180) OR
            (t.chain_id = 8453 AND t.bounty_id >= 986)
          )
        ORDER BY t.chain_id, LOWER(t.tx), t."index" ASC
      )
      SELECT
        TO_CHAR(
          TO_TIMESTAMP(timestamp::double precision) AT TIME ZONE 'UTC',
          'YYYY-MM-DD'
        ) AS "date",
        chain_id AS "chainId",
        action,
        COUNT(*)::integer AS "count"
      FROM first_event
      GROUP BY 1, 2, 3
      ORDER BY 1 ASC
    `;

    return NextResponse.json(aggregateGroupedAnalytics(rows), {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    console.error('poidh analytics summary error', error);
    return NextResponse.json(
      { error: 'Unable to load indexed transactions right now.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
