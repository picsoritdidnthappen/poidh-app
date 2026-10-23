'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/global/Navbar';
import { ACTION_GROUPS, CHAINS, type ActionGroup, type AnalyticsSummary, type ChainKey, type DailyPoint } from '@/poidhAnalytics';

type Range = '7d' | '30d' | '90d' | 'all' | 'custom';
type Period = 'day' | 'week' | 'cumulative';
type Dimension = 'chain' | 'action';
type SeriesKey = ChainKey | ActionGroup;
type Bucket = { start: string; end: string; label: string; count: Record<SeriesKey, number> };
type Detail = {
  tx: string;
  timestamp: number;
  chainId: number;
  chain: string;
  action: string;
  group: string;
  bountyId: number;
  title: string;
  bountyUrl: string;
  explorerUrl: string;
};
type DetailResponse = { items: Detail[]; total: number; hasMore: boolean; error?: string };

const CHAIN_COLORS: Record<ChainKey, string> = { ethereum: '#dce9ff', arbitrum: '#55c0f9', base: '#f16d73' };
const ACTION_COLORS: Record<ActionGroup, string> = {
  claims: '#8bdeca', bounties: '#f16d73', funding: '#f7d485',
  voting: '#acafff', accepted: '#69c8fa', other: '#bec9d5',
};
const CARD = 'rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm';
const BUTTON = 'rounded-full border px-3 py-1.5 text-sm transition-colors';
const KEYS: SeriesKey[] = [...CHAINS.map((c) => c.key), ...ACTION_GROUPS];
const emptyCounts = () => Object.fromEntries(KEYS.map((key) => [key, 0])) as Record<SeriesKey, number>;
const addDays = (date: string, count: number) => new Date(Date.parse(`${date}T00:00:00Z`) + count * 86400000).toISOString().slice(0, 10);
const formatNumber = (value: number) => new Intl.NumberFormat('en-US').format(value);
const niceDate = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const download = (name: string, body: string, mime: string) => {
  const url = URL.createObjectURL(new Blob([body], { type: mime }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
};

function toBucket(point: DailyPoint): Bucket {
  const count = emptyCounts();
  for (const chain of CHAINS) count[chain.key] = point[chain.key];
  for (const action of ACTION_GROUPS) count[action] = point.by[action];
  return { start: point.date, end: point.date, label: niceDate(point.date), count };
}
function bucketize(days: DailyPoint[], period: Period): Bucket[] {
  if (period !== 'week') return days.map(toBucket);
  const result: Bucket[] = [];
  for (const point of days) {
    const date = Date.parse(`${point.date}T00:00:00Z`);
    const weekday = new Date(date).getUTCDay();
    const monday = new Date(date - ((weekday + 6) % 7) * 86400000).toISOString().slice(0, 10);
    let latest = result[result.length - 1];
    if (!latest || latest.start !== monday) {
      latest = { start: monday, end: point.date, label: niceDate(monday), count: emptyCounts() };
      result.push(latest);
    }
    latest.end = point.date;
    const item = toBucket(point);
    for (const key of KEYS) latest.count[key] += item.count[key];
  }
  return result;
}

function MiniChart({ buckets, series, colors, cumulative, dailyAverage, onSelect, selected } : {
  buckets: Bucket[];
  series: SeriesKey[];
  colors: Record<string, string>;
  cumulative: boolean;
  dailyAverage: boolean;
  onSelect: (bucket: Bucket) => void;
  selected: Bucket | null;
}) {
  // Size the entire timeline to the available card width, instead of expanding
  // the SVG horizontally for longer date ranges.
  const chartRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(760);
  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    const measure = () => setContainerWidth(el.getBoundingClientRect().width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const left = 55, top = 20, bottom = 38, height = 300;
  const plotHeight = height - top - bottom;
  const width = Math.max(1, containerWidth);
  const plotWidth = Math.max(1, width - left - 15);
  const step = plotWidth / Math.max(1, buckets.length);
  const barWidth = Math.max(0.5, step * 0.78);
  const totals = buckets.map((bucket) => series.reduce((sum, key) => sum + bucket.count[key], 0));
  const values = cumulative ? totals.reduce<number[]>((acc, n) => {
    acc.push((acc[acc.length - 1] || 0) + n);
    return acc;
  }, []) : totals;
  const average = dailyAverage ? totals.map((_, index) =>
    totals.slice(Math.max(0, index - 6), index + 1).reduce((sum, n) => sum + n, 0) / Math.min(7, index + 1)
  ) : [];
  const max = Math.max(1, ...values, ...average) * 1.12;
  const bottomY = height - bottom;
  const xx = (i: number) => left + (i + 0.5) * step;
  const yy = (n: number) => bottomY - (n / max) * plotHeight;
  const interval = Math.max(1, Math.ceil(buckets.length / Math.max(3, Math.floor(plotWidth / 85))));
  const cumulativePath = values.map((n, i) => `${i ? 'L' : 'M'} ${xx(i)} ${yy(n)}`).join(' ');
  const averagePath = average.map((n, i) => `${i ? 'L' : 'M'} ${xx(i)} ${yy(n)}`).join(' ');
  if (!buckets.length) return <div className='py-24 text-center text-white/70'>no indexed activity for this range</div>;
  return (
    <div ref={chartRef} className='w-full min-w-0 overflow-hidden pb-2' aria-label='Transaction activity chart; click a bar to see the transactions'>
      <svg viewBox={`0 0 ${width} ${height}`} width='100%' height={height} className='block w-full' role='img' aria-label='poidh indexed transaction history'>
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const y = yy(max * tick);
          return <g key={tick}>
            <line x1={left} x2={width - 8} y1={y} y2={y} stroke='white' strokeOpacity={0.17} strokeDasharray='3 5'/>
            <text x={left - 11} y={y + 4} textAnchor='end' fill='white' fillOpacity={0.75} fontSize={11}>{formatNumber(Math.round(max * tick))}</text>
          </g>;
        })}
        {buckets.map((bucket, index) => {
          const x = xx(index);
          let running = 0;
          return <g key={`${bucket.start}-${index}`}>
            {!cumulative && series.map((key) => {
              const value = bucket.count[key];
              const y = yy(running + value);
              const h = (value / max) * plotHeight;
              running += value;
              return <rect key={key} x={x - barWidth / 2} y={y} width={barWidth} height={Math.max(0, h)} fill={colors[key]} rx={1} />;
            })}
            {index % interval === 0 && <text x={x} y={height - 12} fontSize={11} textAnchor='middle' fill='white' fillOpacity={0.72}>{bucket.label}</text>}
            {selected?.start === bucket.start && <rect x={x - step * 0.45} y={top} width={Math.max(0.5, step * 0.9)} height={plotHeight} stroke='white' strokeOpacity={0.55} fill='white' fillOpacity={0.04} />}
            <rect x={x - step / 2} y={top} width={step} height={plotHeight} fill='transparent'
              role='button' tabIndex={0} aria-label={`${bucket.start} to ${bucket.end}: ${formatNumber(totals[index])} transactions. Show details`}
              className='cursor-pointer' onClick={() => onSelect(bucket)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(bucket); } }}>
              <title>{`${bucket.start}${bucket.start !== bucket.end ? ` – ${bucket.end}` : ''}: ${formatNumber(totals[index])} transactions`}</title>
            </rect>
          </g>;
        })}
        {cumulative && <path d={cumulativePath} stroke='#f9fbff' fill='none' strokeWidth={2.5} strokeLinejoin='round' pointerEvents='none' />}
        {dailyAverage && <path d={averagePath} stroke='#fff4bd' fill='none' strokeWidth={2} strokeDasharray='6 4' pointerEvents='none' />}
      </svg>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState<Range>('30d');
  const [period, setPeriod] = useState<Period>('day');
  const [dimension, setDimension] = useState<Dimension>('chain');
  const [active, setActive] = useState<SeriesKey[]>(KEYS);
  const [customFrom, setCustomFrom] = useState('2026-01-01');
  const [customTo, setCustomTo] = useState(new Date().toISOString().slice(0, 10));
  const [selected, setSelected] = useState<Bucket | null>(null);
  const [detail, setDetail] = useState<Detail[]>([]);
  const [detailTotal, setDetailTotal] = useState(0);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [detailOffset, setDetailOffset] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get('range');
    const p = params.get('period');
    const d = params.get('view');
    if (r && ['7d', '30d', '90d', 'all', 'custom'].includes(r)) setRange(r as Range);
    if (p && ['day', 'week', 'cumulative'].includes(p)) setPeriod(p as Period);
    if (d && ['chain', 'action'].includes(d)) setDimension(d as Dimension);
    if (params.get('from')) setCustomFrom(params.get('from')!);
    if (params.get('to')) setCustomTo(params.get('to')!);
  }, []);
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('range', range);
    params.set('period', period);
    params.set('view', dimension);
    if (range === 'custom') { params.set('from', customFrom); params.set('to', customTo); }
    window.history.replaceState(null, '', `/analytics?${params.toString()}`);
  }, [range, period, dimension, customFrom, customTo]);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/analytics', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load indexed transactions');
        return response.json() as Promise<AnalyticsSummary>;
      })
      .then((data) => { setSummary(data); setError(''); })
      .catch((err: Error) => { if (err.name !== 'AbortError') setError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const days = useMemo(() => {
    if (!summary) return [];
    const finalDay = summary.throughDate;
    const start = range === 'all' ? summary.startDate : range === 'custom' ? customFrom :
      addDays(finalDay, -(range === '7d' ? 6 : range === '30d' ? 29 : 89));
    const end = range === 'custom' ? customTo : finalDay;
    if (end < start) return [];
    return summary.days.filter((day) => day.date >= start && day.date <= end);
  }, [summary, range, customFrom, customTo]);
  const buckets = useMemo(() => bucketize(days, period), [days, period]);
  const series = useMemo(() => (
    (dimension === 'chain' ? CHAINS.map((c) => c.key) : [...ACTION_GROUPS]).filter((key) => active.includes(key))
  ), [dimension, active]);
  const palette: Record<string, string> = dimension === 'chain' ? CHAIN_COLORS : ACTION_COLORS;
  const counts = days.map((day) => series.reduce((sum, key) =>
    sum + (key === 'ethereum' || key === 'arbitrum' || key === 'base' ? day[key] : day.by[key]), 0));
  const total = counts.reduce((sum, value) => sum + value, 0);
  const peak = counts.length ? Math.max(...counts) : 0;
  const average = counts.length ? total / counts.length : 0;

  // Avoid loading all historical tx hashes just to draw a chart. Drilldowns are
  // fetched only when a user clicks a bar or date table row.
  useEffect(() => {
    if (!selected) { setDetail([]); return; }
    const controller = new AbortController();
    setDetailLoading(true);
    setDetail([]);
    setDetailTotal(0);
    setDetailOffset(0);
    setDetailError('');
    const q = new URLSearchParams({ from: selected.start, to: selected.end, offset: '0' });
    fetch(`/api/analytics/transactions?${q}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error('Could not load transaction details');
        return res.json() as Promise<DetailResponse>;
      })
      .then((data) => { setDetail(data.items); setDetailTotal(data.total); setHasMore(data.hasMore); setDetailOffset(data.items.length); })
      .catch((err: Error) => { if (err.name !== 'AbortError') setDetailError(err.message); })
      .finally(() => { if (!controller.signal.aborted) setDetailLoading(false); });
    return () => controller.abort();
  }, [selected]);

  const more = async () => {
    if (!selected || !hasMore || detailLoading) return;
    setDetailLoading(true);
    try {
      const q = new URLSearchParams({ from: selected.start, to: selected.end, offset: String(detailOffset) });
      const response = await fetch(`/api/analytics/transactions?${q}`);
      if (!response.ok) throw new Error('Could not load more transactions');
      const data = (await response.json()) as DetailResponse;
      setDetail((old) => [...old, ...data.items]);
      setDetailOffset((old) => old + data.items.length);
      setHasMore(data.hasMore);
    } catch (err) { setDetailError(err instanceof Error ? err.message : 'Unable to load transactions'); }
    finally { setDetailLoading(false); }
  };
  const csv = () => {
    const header = ['date_utc', 'ethereum', 'arbitrum', 'base', 'total', ...ACTION_GROUPS];
    const body = days.map((d) => [d.date, d.ethereum, d.arbitrum, d.base, d.total, ...ACTION_GROUPS.map((key) => d.by[key])].join(','));
    download('poidh-analytics.csv', [header.join(','), ...body].join('\r\n'), 'text/csv;charset=utf-8');
  };
  const exportJson = () => download('poidh-analytics.json', JSON.stringify({ source: summary?.source, days }, null, 2), 'application/json');
  const selectBucket = (bucket: Bucket) => {
    // If range starts mid-week, drill down only into dates actually in range.
    const first = days[0]?.date || bucket.start;
    setSelected({ ...bucket, start: bucket.start < first ? first : bucket.start });
  };

  return <div className='min-h-screen pb-24 px-4 pt-10 text-white font-mono sm:px-8'>
    <main className='max-w-7xl mx-auto space-y-5'>
      <header className='mb-6 text-center space-y-2'>
        <h1 className='text-4xl sm:text-5xl'>poidh analytics 📊</h1>
        <p className='text-sm sm:text-base text-white/75'>indexed v3 transactions across ethereum, arbitrum, and base</p>
      </header>
      {error && <div role='alert' className={`${CARD} p-6 text-center`}>{error} — <button onClick={() => window.location.reload()} className='underline'>try again</button></div>}
      {loading && <div className={`${CARD} p-12 text-center animate-pulse`}>loading indexer activity…</div>}
      {summary && <>
        <section className='grid grid-cols-2 lg:grid-cols-4 gap-3' aria-label='Summary statistics'>
          {[
            ['transactions', formatNumber(total)],
            ['daily average', average.toFixed(1)],
            ['peak day', formatNumber(peak)],
            ['days in range', formatNumber(days.length)],
          ].map(([label, value]) => <div key={label} className={`${CARD} p-4 sm:p-5`}>
            <p className='text-xs text-white/65 mb-3'>{label}</p>
            <p className='text-2xl sm:text-3xl font-bold tracking-tight'>{value}</p>
          </div>)}
        </section>
        <section className={`${CARD} p-4 sm:p-6 space-y-5`}>
          <div className='flex flex-wrap justify-between items-start gap-3'>
            <h2 className='text-xl font-semibold'>transaction activity</h2>
            <div className='flex items-center gap-2'>
              <button onClick={csv} className={`${BUTTON} border-white/30 hover:bg-white/20`}>↓ csv</button>
              <button onClick={exportJson} className={`${BUTTON} border-white/30 hover:bg-white/20`}>↓ json</button>
            </div>
          </div>
          <div className='flex flex-wrap gap-2 items-center'>
            {(['7d', '30d', '90d', 'all', 'custom'] as const).map((item) => <button key={item} onClick={() => { setRange(item); setSelected(null); }}
              aria-pressed={range === item} className={`${BUTTON} ${range === item ? 'bg-poidhRed border-poidhRed' : 'bg-black/10 border-white/25 hover:bg-white/15'}`}>{item === 'all' ? 'since jan 1' : item}</button>)}
          </div>
          {range === 'custom' && <div className='flex flex-wrap gap-3 items-center text-sm'>
            <label className='flex items-center gap-2'>from <input aria-label='From date' type='date' min='2026-01-01' max={summary.throughDate} value={customFrom} onChange={(e) => { setCustomFrom(e.target.value); setSelected(null); }} className='rounded-lg border border-white/30 bg-[#173e66] px-2 py-1'/></label>
            <label className='flex items-center gap-2'>to <input aria-label='To date' type='date' min='2026-01-01' max={summary.throughDate} value={customTo} onChange={(e) => { setCustomTo(e.target.value); setSelected(null); }} className='rounded-lg border border-white/30 bg-[#173e66] px-2 py-1'/></label>
          </div>}
          <div className='flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-4'>
            <div className='inline-flex rounded-full bg-black/15 p-1 gap-1'>
              {(['day', 'week', 'cumulative'] as const).map((item) => <button key={item} onClick={() => { setPeriod(item); setSelected(null); }} aria-pressed={period === item}
                className={`rounded-full px-3 py-1.5 text-sm ${period === item ? 'bg-white text-[#173e66]' : 'hover:bg-white/10'}`}>{item === 'cumulative' ? 'cumulative' : `${item}ly`}</button>)}
            </div>
            <div className='inline-flex rounded-full bg-black/15 p-1 gap-1'>
              {(['chain', 'action'] as const).map((item) => <button key={item} onClick={() => { setDimension(item); setSelected(null); }} aria-pressed={dimension === item}
                className={`rounded-full px-3 py-1.5 text-sm ${dimension === item ? 'bg-white text-[#173e66]' : 'hover:bg-white/10'}`}>by {item}</button>)}
            </div>
          </div>
          <div className='flex flex-wrap gap-2'>
            {(dimension === 'chain' ? CHAINS.map((chain) => ({ key: chain.key, label: chain.label })) : ACTION_GROUPS.map((group) => ({ key: group, label: group }))).map(({ key, label }) => {
              const on = active.includes(key);
              return <button key={key} onClick={() => setActive((old) => on ? old.filter((k) => k !== key) : [...old, key])}
                aria-pressed={on} className={`inline-flex items-center gap-2 rounded-full border border-white/25 px-3 py-1.5 text-xs ${on ? 'bg-white/10' : 'opacity-45'}`}>
                  <span aria-hidden='true' className='w-2.5 h-2.5 rounded-full' style={{ backgroundColor: palette[key] }}/>{label}
                </button>;
            })}
          </div>
          <MiniChart buckets={buckets} series={series} colors={palette} cumulative={period === 'cumulative'} dailyAverage={period === 'day'} onSelect={selectBucket} selected={selected}/>
          <div className='flex flex-wrap justify-between gap-2 text-xs text-white/65'>
            <span>{period === 'day' && <span className='text-[#fff4bd]'>- - 7-day moving average · </span>}click a bar, point, or table row for transaction links</span>
            <span>UTC dates · updated hourly</span>
          </div>
        </section>
        {selected && <section className={`${CARD} p-4 sm:p-6 space-y-4`} aria-label='Selected transactions'>
          <div className='flex items-center justify-between gap-2'>
            <div><h2 className='text-lg font-semibold'>transactions · {selected.start}{selected.end !== selected.start ? ` – ${selected.end}` : ''}</h2>
              <p className='text-xs text-white/65'>{formatNumber(detailTotal)} transactions on the selected date(s), across all chains and actions</p></div>
            <button aria-label='Close transaction details' onClick={() => setSelected(null)} className={`${BUTTON} border-white/25`}>✕</button>
          </div>
          {detailError && <p role='alert' className='text-red-200'>{detailError}</p>}
          {!detail.length && detailLoading && <p className='text-white/70'>loading details…</p>}
          {!detail.length && !detailLoading && <p className='text-white/70'>no transactions found</p>}
          {!!detail.length && <div className='divide-y divide-white/15'>
            {detail.map((item) => <div key={`${item.chainId}:${item.tx}`} className='flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between py-3 text-sm'>
              <div className='min-w-0 space-y-1'><div className='flex items-center gap-2 text-xs text-white/65'>
                <span>{item.chain}</span><span>·</span><span>{item.action}</span><span>·</span>
                <time dateTime={new Date(item.timestamp * 1000).toISOString()}>{new Date(item.timestamp * 1000).toLocaleTimeString('en-US', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })} UTC</time>
              </div><Link href={item.bountyUrl} className='underline decoration-white/30 underline-offset-4 hover:decoration-white break-words'>{item.title}</Link></div>
              <a href={item.explorerUrl} target='_blank' rel='noopener noreferrer' className='text-xs shrink-0 text-[#dce9ff] underline underline-offset-4'>{item.tx.slice(0, 10)}… ↗</a>
            </div>)}
          </div>}
          {hasMore && <button onClick={more} disabled={detailLoading} className={`${BUTTON} border-white/30 hover:bg-white/20 disabled:opacity-60`}>{detailLoading ? 'loading…' : 'load more transactions'}</button>}
        </section>}
        <section className={`${CARD} overflow-hidden`}>
          <div className='flex justify-between items-center gap-2 p-4 sm:p-6 border-b border-white/20'>
            <h2 className='text-lg font-semibold'>daily totals</h2>
            <p className='text-xs text-white/65'>select a row to inspect transactions</p>
          </div>
          <div className='max-h-[440px] overflow-auto'>
            <table className='w-full text-xs sm:text-sm text-left tabular-nums'>
              <thead className='sticky top-0 bg-[#215887] dark:bg-[#112b45]'><tr>
                <th scope='col' className='p-3'>date (utc)</th><th className='p-3 text-right'>ethereum</th>
                <th className='p-3 text-right'>arbitrum</th><th className='p-3 text-right'>base</th><th className='p-3 text-right'>total</th>
              </tr></thead>
              <tbody>{[...days].reverse().map((row) => <tr key={row.date} tabIndex={0} role='button' aria-label={`Show ${row.date} transactions`}
                onClick={() => selectBucket(toBucket(row))}
                onKeyDown={(e) => { if (e.key === 'Enter') selectBucket(toBucket(row)); }}
                className='cursor-pointer border-t border-white/10 hover:bg-white/15 focus:bg-white/15'>
                <td className='p-3 whitespace-nowrap'>{row.date}</td><td className='p-3 text-right'>{formatNumber(row.ethereum)}</td>
                <td className='p-3 text-right'>{formatNumber(row.arbitrum)}</td><td className='p-3 text-right'>{formatNumber(row.base)}</td>
                <td className='p-3 text-right font-semibold'>{formatNumber(row.total)}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </section>
        <p className='pb-4 text-xs text-white/65 leading-relaxed'>
          Source: poidh&apos;s indexer-backed PostgreSQL database. Counts unique transaction hashes per chain on v3 bounties, starting January 1, 2026.
          Events within a single transaction count once. Smart-wallet transactions are included; transfers or withdrawals not indexed against a bounty are not included.
          The first indexed event determines the action category. Summary refreshes hourly, and recent activity may lag chain state.
          Last generated: {new Date(summary.generatedAt).toLocaleString()}.
        </p>
      </>}
    </main>
    <Navbar type='bounty'/>
  </div>;
}
