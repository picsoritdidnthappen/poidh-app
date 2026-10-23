/**
 * Native poidh analytics, based solely on the app's indexed PostgreSQL data.
 * Counts unique (chainId, txHash) combinations, not event rows.
 */
export const ANALYTICS_START = '2026-01-01';
export const ANALYTICS_START_TIMESTAMP = 1767225600;

export const CHAINS = [
  { id: 1, key: 'ethereum', label: 'Ethereum', slug: 'mainnet', explorer: 'https://etherscan.io/tx/' },
  { id: 42161, key: 'arbitrum', label: 'Arbitrum', slug: 'arbitrum', explorer: 'https://arbiscan.io/tx/' },
  { id: 8453, key: 'base', label: 'Base', slug: 'base', explorer: 'https://basescan.org/tx/' },
] as const;
export type ChainKey = 'ethereum' | 'arbitrum' | 'base';
export const ACTION_GROUPS = ['claims', 'bounties', 'funding', 'voting', 'accepted', 'other'] as const;
export type ActionGroup = (typeof ACTION_GROUPS)[number];

export interface IndexedTransaction {
  tx: string;
  index: number;
  chainId: number;
  timestamp: { toString(): string } | number | string;
  bountyId: number;
  action: string;
}
export type DailyPoint = {
  date: string;
  ethereum: number;
  arbitrum: number;
  base: number;
  total: number;
  by: Record<ActionGroup, number>;
  /** Gross ETH deposited into bounties, not payouts or net TVL. */
  eth: { ethereum: number; arbitrum: number; base: number; total: number; by: Record<ActionGroup, number> };
};
export type AnalyticsSummary = {
  generatedAt: string;
  source: 'poidh indexed PostgreSQL transactions';
  startDate: string;
  throughDate: string;
  days: DailyPoint[];
};
export function chainFor(id: number) {
  return CHAINS.find((chain) => chain.id === id);
}
export function isV3Bounty(chainId: number, bountyId: number): boolean {
  return (chainId === 1 && bountyId >= 0) ||
    (chainId === 42161 && bountyId >= 180) ||
    (chainId === 8453 && bountyId >= 986);
}
export function actionGroup(action: string): ActionGroup {
  const a = (action || '').trim().toLowerCase();
  if (a === 'claim created') return 'claims';
  if (a === 'bounty created' || a === 'bounty canceled') return 'bounties';
  if (a === 'claim accepted') return 'accepted';
  if (a === 'funding') return 'funding';
  if (a === 'voted' || a === 'voting resolved' || a.endsWith('submitted for vote')) return 'voting';
  if (/^[+-][\d.]+ eth$/.test(a) || a === 'funds claimed') return 'funding';
  return 'other';
}
export function utcDay(timestamp: IndexedTransaction['timestamp']): string | null {
  const seconds = Number(timestamp.toString());
  if (!Number.isFinite(seconds)) return null;
  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}
export function uniqueTransactions<T extends IndexedTransaction>(rows: T[]): T[] {
  // When one transaction emits several indexed actions, classify it by
  // its first log index, not by arbitrary DB pagination / ordering.
  const unique = new Map<string, T>();
  for (const row of rows) {
    if (!isV3Bounty(row.chainId, row.bountyId)) continue;
    const day = utcDay(row.timestamp);
    if (!day || day < ANALYTICS_START) continue;
    const key = `${row.chainId}:${row.tx.toLowerCase()}`;
    const existing = unique.get(key);
    if (!existing || row.index < existing.index) unique.set(key, row);
  }
  return [...unique.values()];
}
export type GroupedTransactionCount = { date: string; chainId: number; action: string; count: number };
export type GroupedEthVolume = { date: string; chainId: number; action: string; eth: string };

function emptyAnalytics(now: Date): AnalyticsSummary {
  const throughDate = now.toISOString().slice(0, 10);
  const days: DailyPoint[] = [];
  for (let time = Date.parse(`${ANALYTICS_START}T00:00:00Z`); time <= Date.parse(`${throughDate}T00:00:00Z`); time += 86400000) {
    const date = new Date(time).toISOString().slice(0, 10);
    const by = Object.fromEntries(ACTION_GROUPS.map((g) => [g, 0])) as Record<ActionGroup, number>;
    const point: DailyPoint = { date, ethereum: 0, arbitrum: 0, base: 0, total: 0, by,
      eth: { ethereum: 0, arbitrum: 0, base: 0, total: 0, by: { ...by } } };
    days.push(point);
  }
  return {
    generatedAt: now.toISOString(),
    source: 'poidh indexed PostgreSQL transactions',
    startDate: ANALYTICS_START,
    throughDate,
    days,
  };
}

export function aggregateGroupedAnalytics(
  rows: GroupedTransactionCount[],
  now = new Date(),
  volumeRows: GroupedEthVolume[] = [],
): AnalyticsSummary {
  const summary = emptyAnalytics(now);
  const lookup = new Map(summary.days.map((row) => [row.date, row]));
  for (const entry of rows) {
    const point = lookup.get(entry.date);
    const chain = chainFor(entry.chainId);
    if (!point || !chain || !Number.isFinite(entry.count) || entry.count < 0) continue;
    point[chain.key] += entry.count;
    point.total += entry.count;
    point.by[actionGroup(entry.action)] += entry.count;
  }
  for (const entry of volumeRows) {
    const point = lookup.get(entry.date);
    const chain = chainFor(entry.chainId);
    const amount = Number(entry.eth);
    if (!point || !chain || !Number.isFinite(amount) || amount < 0) continue;
    point.eth[chain.key] += amount;
    point.eth.total += amount;
    point.eth.by[actionGroup(entry.action)] += amount;
  }
  return summary;
}

export function aggregateAnalytics(rows: IndexedTransaction[], now = new Date()): AnalyticsSummary {
  return aggregateGroupedAnalytics(uniqueTransactions(rows).map((tx) => ({
    date: utcDay(tx.timestamp) || '',
    chainId: tx.chainId,
    action: tx.action,
    count: 1,
  })), now);
}
