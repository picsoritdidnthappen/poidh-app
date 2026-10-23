import { NextResponse } from 'next/server';
import prisma from 'prisma/prisma';
import {
  aggregateGroupedAnalytics,
  ANALYTICS_START_TIMESTAMP,
  type GroupedTransactionCount,
  type GroupedEthVolume,
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

    // Reconstruct historical initial funding: the indexed Bounties.amount is
    // the *current/latest* bounty amount, not necessarily its creation amount.
    // latest = initial + joins - open-bounty withdrawals. Payouts/refunds do
    // not count as new ETH volume, and we do not subtract them from gross volume.
    // Read existing indexer-backed tables only; no RPCs or external data.
    const volumeRows = await prisma.$queryRaw<GroupedEthVolume[]>`
      WITH signed_movements AS (
        SELECT
          chain_id,
          bounty_id,
          SUM(SPLIT_PART(action, ' ', 1)::numeric) AS net_added_eth
        FROM "Transactions"
        WHERE action ~ '^[+-][0-9]+([.][0-9]+)? eth$'
          AND (
            chain_id = 1 OR
            (chain_id = 42161 AND bounty_id >= 180) OR
            (chain_id = 8453 AND bounty_id >= 986)
          )
        GROUP BY chain_id, bounty_id
      ), funding_events AS (
        SELECT
          TO_CHAR(TO_TIMESTAMP(t.timestamp::double precision) AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
          t.chain_id,
          CASE WHEN t.action = 'bounty created' THEN 'bounty created' ELSE 'funding' END AS action,
          CASE
            WHEN t.action = 'bounty created' THEN GREATEST(
              0::numeric,
              b.amount::numeric / 1000000000000000000::numeric - COALESCE(m.net_added_eth, 0)
            )
            ELSE SUBSTRING(SPLIT_PART(t.action, ' ', 1) FROM 2)::numeric
          END AS eth_amount
        FROM "Transactions" t
        JOIN "Bounties" b ON b.id = t.bounty_id AND b.chain_id = t.chain_id
        LEFT JOIN signed_movements m ON m.bounty_id = t.bounty_id AND m.chain_id = t.chain_id
        WHERE t.timestamp >= ${ANALYTICS_START_TIMESTAMP}::numeric
          AND (t.action = 'bounty created' OR t.action ~ '^[+][0-9]+([.][0-9]+)? eth$')
          AND (
            t.chain_id = 1 OR
            (t.chain_id = 42161 AND t.bounty_id >= 180) OR
            (t.chain_id = 8453 AND t.bounty_id >= 986)
          )
      )
      SELECT date AS "date", chain_id AS "chainId", action,
        SUM(eth_amount)::text AS "eth"
      FROM funding_events
      GROUP BY date, chain_id, action
      ORDER BY date ASC
    `;

    return NextResponse.json(aggregateGroupedAnalytics(rows, new Date(), volumeRows), {
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
