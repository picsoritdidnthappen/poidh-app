'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type AnalyticsDay = {
  date: string;
  total: number;
  eth: { total: number };
};

type AnalyticsResponse = {
  throughDate: string;
  days: AnalyticsDay[];
};

type ThirtyDayStats = {
  transactions: number;
  ethFunded: number;
};

// Both the desktop header and slide-out menu can use the same in-flight request.
let summaryRequest: Promise<ThirtyDayStats> | null = null;
let summaryRequestedAt = 0;

function lastThirtyDays(data: AnalyticsResponse): ThirtyDayStats {
  const end = data.throughDate;
  const endTime = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(endTime) || !Array.isArray(data.days)) {
    throw new Error('Invalid analytics response');
  }

  // Inclusive range: UTC today plus the preceding 29 UTC dates.
  const start = new Date(endTime - 29 * 86400000).toISOString().slice(0, 10);
  return data.days.reduce(
    (sum, day) => {
      if (day.date >= start && day.date <= end) {
        sum.transactions += Number(day.total) || 0;
        sum.ethFunded += Number(day.eth?.total) || 0;
      }
      return sum;
    },
    { transactions: 0, ethFunded: 0 }
  );
}

function loadStats(): Promise<ThirtyDayStats> {
  if (!summaryRequest || Date.now() - summaryRequestedAt >= 3600000) {
    summaryRequestedAt = Date.now();
    summaryRequest = fetch('/api/analytics')
      .then((response) => {
        if (!response.ok) throw new Error('Analytics unavailable');
        return response.json() as Promise<AnalyticsResponse>;
      })
      .then(lastThirtyDays)
      .catch((error: unknown) => {
        // Allow a subsequent mount to retry if the initial request failed.
        summaryRequest = null;
        summaryRequestedAt = 0;
        throw error;
      });
  }
  return summaryRequest;
}

const transactionFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

// Always display two decimal places, truncating instead of rounding up.
// e.g. 3.616 ETH -> 3.61 ETH.
function formatEth(value: number): string {
  const truncated = Math.trunc((value + Number.EPSILON) * 100) / 100;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(truncated);
}

/** Desktop: rotating single-line ticker. Menu: two static stacked rows. */
export default function AnalyticsTicker({
  variant,
  onNavigate,
}: {
  variant: 'desktop' | 'menu';
  onNavigate?: () => void;
}) {
  const [stats, setStats] = useState<ThirtyDayStats | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      loadStats()
        .then((value) => {
          if (active) setStats(value);
        })
        .catch(() => {
          // The header is not critical UI: stay unobtrusive on API failures.
        });
    };
    refresh();
    const interval = window.setInterval(refresh, 3600000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (variant !== 'desktop' || !stats || hovered) return;
    const interval = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % 2);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [variant, stats, hovered]);

  if (variant === 'menu') {
    if (!stats) return null;
    return (
      <Link
        href='/analytics'
        onClick={onNavigate}
        className='mt-5 block border-t border-white/30 pt-4 text-white hover:text-gray-200 lg:hidden'
        aria-label='View poidh analytics for the last 30 days'
      >
        <div className='mb-2 text-xs uppercase tracking-wide text-white/70'>last 30 days ↗</div>
        <div className='flex items-baseline justify-between gap-3 py-1 text-sm'>
          <span>volume</span>
          <span className='font-semibold tabular-nums'>{formatEth(stats.ethFunded)} ETH</span>
        </div>
        <div className='flex items-baseline justify-between gap-3 py-1 text-sm'>
          <span>transactions</span>
          <span className='font-semibold tabular-nums'>{transactionFormatter.format(stats.transactions)}</span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href='/analytics'
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      className='flex w-full min-w-0 max-w-[270px] items-center justify-center rounded-lg bg-white/15 px-3 py-2 text-white hover:bg-white/25 transition-colors h-10'
      aria-label={stats ? `View poidh analytics: ${formatEth(stats.ethFunded)} ETH volume and ${transactionFormatter.format(stats.transactions)} transactions in the last 30 days` : 'View poidh analytics'}
    >
      {!stats ? (
        <span className='text-xs whitespace-nowrap'>analytics ↗</span>
      ) : (
        <span className='block w-full h-5 overflow-hidden whitespace-nowrap text-center text-xs font-medium' aria-live='off'>
          <span
            className='flex flex-col transition-transform duration-500 ease-in-out motion-reduce:transition-none'
            style={{ transform: `translateY(-${activeIndex * 50}%)` }}
          >
            <span className='h-5 leading-5 shrink-0'>30D VOLUME · {formatEth(stats.ethFunded)} ETH ↗</span>
            <span className='h-5 leading-5 shrink-0'>30D TRANSACTIONS · {transactionFormatter.format(stats.transactions)} ↗</span>
          </span>
        </span>
      )}
    </Link>
  );
}
