import Link from 'next/link';
import DisplayAddress from '@/components/global/DisplayAddress';
import ClaimImageEmbed from '@/components/feed/ClaimImageEmbed';
import { getChainById } from '@/utils/config';
import { trpc } from '@/trpc/client';
import { formatAmount } from '@/utils/utils';
import { formatEther } from 'viem';
import { ChainId, Claim } from '@/utils/types';

type ActivityTx = {
  tx: string;
  index?: number;
  bounty?: {
    id: number;
    chain_id: number;
    title: string;
    issuer: string;
  } | null;
  claim?: Claim | null;
  bounty_id: number;
  claim_id?: number;
  chain_id: ChainId;
  address: string;
  action: string;
  timestamp: number | string;
};

export default function Activity({ activity }: { activity: ActivityTx }) {
  const bountyId = activity.bounty?.id ?? activity.bounty_id;
  const chainId = activity.bounty?.chain_id ?? activity.chain_id;
  const chain = getChainById({ chainId: chainId as ChainId });

  const bountyData = trpc.bounty.useQuery(
    { id: bountyId ?? 0, chainId: chainId ?? 0 },
    { enabled: Boolean(bountyId && chainId) }
  );

  const priceData = trpc.fetchPrice.useQuery(
    { currency: chain?.currency ?? 'eth' },
    { enabled: Boolean(chain?.currency) }
  );

  const bountyPrice =
    bountyData.data && priceData.data
      ? formatAmount({
          amount: formatEther(BigInt(bountyData.data.amount)),
          price: priceData.data.toString(),
          currency: chain.currency,
          precision: 4,
        })
      : '...';

  const dateTime = activity.timestamp
    ? (() => {
        const dateObj = new Date(Number(activity.timestamp) * 1000);
        const dateStr = dateObj.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
        const timeStr = dateObj.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
        return { date: dateStr, time: timeStr };
      })()
    : { date: '', time: '' };

  function renderText() {
    const action = activity.action || '';

    if (action === 'bounty created') {
      return <div>a new bounty has been created 💰</div>;
    }

    if (action === 'claim created') {
      return (
        <div>
          new claim on
          {activity.bounty?.title ? (
            <span>
              <strong>
                {` `}
                {activity.bounty.title} {` `}
              </strong>
              valued at {` ${bountyPrice} `}
            </span>
          ) : (
            <span>{` `} bounty</span>
          )}
          📸
        </div>
      );
    }

    if (action === 'claim accepted') {
      return (
        <div>
          a claim has been accepted for{' '}
          {activity.bounty?.title ? (
            <strong>{activity.bounty.title + ' 🏆'}</strong>
          ) : (
            'this bounty 🏆'
          )}
        </div>
      );
    }

    if (action[0] === '+' || action[0] === '-') {
      const isAdd = action[0] === '+';
      const verb = isAdd ? 'added' : 'removed';
      const prep = isAdd ? 'to' : 'from';
      const amountRaw = action.slice(1).trim();

      const contribution = priceData?.data
        ? formatAmount({
            amount: amountRaw,
            currency: chain.currency,
            price: String(priceData.data),
          })
        : `${amountRaw} ${chain.currency}`;

      return (
        <div>
          {verb} {contribution} {prep}{' '}
          {activity.bounty?.title ? (
            <strong>{activity.bounty.title}</strong>
          ) : (
            'this bounty'
          )}
        </div>
      );
    }

    if (action.includes('submitted for vote')) {
      return (
        <div>
          a claim has been nominated for vote, contributors have 48 hours to
          confirm
        </div>
      );
    }

    if (action === 'voted') {
      return (
        <div>
          <DisplayAddress
            address={activity.address ?? ''}
            showPfpIfExists={false}
          />{' '}
          has voted on a claim for{' '}
          {activity.bounty?.title ? (
            <strong>{activity.bounty.title}</strong>
          ) : (
            'this bounty'
          )}
        </div>
      );
    }

    return <div className='truncate'>{activity.action ?? 'activity'}</div>;
  }

  return (
    <div className='w-full max-w-full sm:max-w-3xl bg-white/5 border border-white/8 rounded-lg backdrop-blur-sm mt-4 sm:mt-5 overflow-hidden shadow-sm'>
      <div className='px-4 py-3 sm:px-6 sm:py-4  bg-[#7fb7ee]'>
        <div className='flex items-start justify-between gap-4'>
          <div className='flex items-center gap-3'>
            <DisplayAddress
              address={
                activity.action === 'claim accepted'
                  ? activity.bounty?.issuer ?? ''
                  : activity?.address
                  ? activity.address
                  : ''
              }
              pfpSize={36}
            />
          </div>

          <div className='text-xs sm:text-sm text-white/60 whitespace-nowrap ml-auto text-right'>
            <div>{dateTime.date}</div>
            <div>{dateTime.time}</div>
          </div>
        </div>

        <div className='mt-3'>
          <div className='text-sm sm:text-base text-white/90 font-mono leading-relaxed'>
            {renderText()}
          </div>
        </div>
      </div>

      {activity.claim ? (
        <div className='border-t border-white/6'>
          <ClaimImageEmbed
            claim={activity.claim}
            bountyId={bountyId}
            chainId={chainId as ChainId}
          />
        </div>
      ) : (
        <div className='border-t border-white/6 px-4 pb-4 pt-2'>
          {bountyId && chain && (
            <div
              className='mt-3 p-3 sm:p-4 border border-white/6 rounded-md'
              style={{
                background:
                  'linear-gradient(to bottom, #2a81d5, #70aae2, #6fa9e1, #2a81d5)',
              }}
            >
              <Link
                href={`/${chain.slug}/bounty/${bountyId}`}
                className='flex items-center justify-between gap-4'
              >
                <div className='flex flex-col'>
                  <span className='font-mono text-m mb-3'>
                    {activity.bounty?.title ?? 'view bounty'}
                  </span>
                  {bountyData.data?.amount && priceData.data && chain && (
                    <span className='font-mono text-s text-white/70 mt-1'>
                      {bountyPrice}
                    </span>
                  )}
                </div>
                <div className='text-xs text-white/60 hover:text-poidhRed'>Open</div>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
