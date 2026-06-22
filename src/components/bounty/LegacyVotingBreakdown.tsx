import { PieChart } from 'react-minimal-pie-chart';
import { formatEther } from 'viem';
import { trpc } from '@/trpc/client';
import { Currency } from '@/utils/types';
import CopyAddressButton from '@/components/global/CopyAddressButton';
import DisplayAddress from '@/components/global/DisplayAddress';

/**
 * Voting breakdown for legacy (v2) multiplayer bounties whose voting flow
 * ran entirely on-chain and therefore has no rows in the `votes` table.
 *
 * Voting weight in v2 was proportional to each contributor's stake, so we
 * surface the contributor breakdown as the voting power distribution and
 * note that the precise yes/no tally lives on-chain. (Closes #1276)
 */
export default function LegacyVotingBreakdown({
  bountyId,
  chainId,
  currency,
  isAcceptedBounty,
}: {
  bountyId: number;
  chainId: number;
  currency: Currency;
  isAcceptedBounty: boolean;
}) {
  const participants = trpc.bounties.participations.useQuery(
    { bountyId, chainId },
    { enabled: !isNaN(bountyId) }
  );

  const data = participants.data ?? [];
  const totalWei = data.reduce((acc, p) => acc + BigInt(p.amount), BigInt(0));

  const palette = [
    '#2A81D5',
    '#F15E5F',
    '#7FB7EE',
    '#F1B95E',
    '#5EC7A8',
    '#A56EE0',
    '#E07EB6',
    '#5A5A5A',
  ];

  const chartData = data
    .map((p, i) => ({
      title: p.userAddress,
      value: Number(formatEther(BigInt(p.amount))),
      color: palette[i % palette.length],
    }))
    .filter((d) => d.value > 0);

  return (
    <div className='w-full mt-5'>
      <div className='bg-gradient-to-br from-white/5 via-white/10 to-white/5 rounded-2xl border border-white/20 p-6 backdrop-blur-md shadow-2xl'>
        <div className='space-y-3'>
          <div className='text-center'>
            <h3 className='text-lg font-family-pixeloid text-poidhRed [text-shadow:-0.5px_-0.5px_0_white,0.5px_-0.5px_0_white,-0.5px_0.5px_0_white,0.5px_0.5px_0_white]'>
              {isAcceptedBounty ? 'Voting resolved' : 'Voting on-chain'}
            </h3>
            <p className='mt-1 text-[11px] text-white/60'>
              legacy (v2) bounty — voting weight is proportional to each
              contributor&apos;s stake
            </p>
          </div>

          {chartData.length > 0 && (
            <div className='flex justify-center'>
              <PieChart
                data={chartData}
                radius={40}
                labelStyle={() => ({ fontSize: '4px', fontWeight: 'bold' })}
                animate
              />
            </div>
          )}

          <div className='space-y-2 bg-white/5 rounded-lg p-3 border border-white/10'>
            <div className='flex items-center justify-between text-sm'>
              <span className='text-white/70'>Total stake</span>
              <span className='font-semibold'>
                {formatEther(totalWei)} {currency}
              </span>
            </div>
            <div className='flex items-center justify-between text-sm'>
              <span className='text-white/70'>Contributors</span>
              <span className='font-semibold'>{data.length}</span>
            </div>
          </div>

          {data.length > 0 && (
            <div className='space-y-1.5 bg-white/5 rounded-lg p-3 border border-white/10 max-h-64 overflow-y-auto'>
              {data.map((p, i) => {
                const wei = BigInt(p.amount);
                const pct =
                  totalWei > BigInt(0)
                    ? Number((wei * BigInt(10000)) / totalWei) / 100
                    : 0;
                return (
                  <div
                    key={p.userAddress}
                    className='flex items-center justify-between gap-2 text-xs'
                  >
                    <div className='flex items-center gap-1 min-w-0'>
                      <span
                        className='inline-block w-2 h-2 rounded-full shrink-0'
                        style={{
                          backgroundColor: palette[i % palette.length],
                        }}
                      />
                      <span className='mr-1'>
                        <CopyAddressButton address={p.userAddress} size={10} />
                      </span>
                      <DisplayAddress address={p.userAddress} />
                    </div>
                    <span className='text-white/80 font-mono shrink-0'>
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <p className='text-center text-[11px] text-white/50'>
            detailed yes/no tally is recorded on the v2 contract on-chain
          </p>
        </div>
      </div>
    </div>
  );
}
