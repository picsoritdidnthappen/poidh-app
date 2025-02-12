import { useState } from 'react';

import { ExpandMoreIcon } from '@/components/global/Icons';
import { trpc } from '@/trpc/client';
import { Chain } from '@/utils/types';
import { formatEther } from 'viem';
import { cn } from '@/utils';
import CopyAddressButton from '../global/CopyAddressButton';
import DisplayAddress from '../global/DisplayAddress';

export default function BountyMultiplayer({
  chain,
  bountyId,
}: {
  chain: Chain;
  bountyId: string;
}) {
  const [showParticipants, setShowParticipants] = useState(false);

  const participants = trpc.participations.useQuery(
    {
      bountyId: Number(bountyId),
      chainId: chain.id,
    },
    {
      enabled: !!bountyId,
    }
  );

  return (
    <div className='max-w-3xl border border-white/20 rounded-lg backdrop-blur-sm bg-[#D1ECFF]/10 mt-5'>
      <button
        onClick={() => setShowParticipants(!showParticipants)}
        className='w-full px-5 py-3 flex justify-between items-center hover:bg-[#D1ECFF]/10 transition-all'
      >
        <span>
          {participants.data
            ? `${participants.data.length} contributors`
            : 'Loading contributors...'}
        </span>
        <span
          className={cn(
            'transition-transform duration-200',
            showParticipants ? 'rotate-180' : ''
          )}
        >
          <ExpandMoreIcon width={16} height={16} />
        </span>
      </button>

      {showParticipants && (
        <div className='divide-y divide-white/10'>
          {participants.isSuccess ? (
            participants.data.map((participant) => (
              <div
                key={participant.user_address}
                className='flex items-center p-4 hover:bg-[#D1ECFF]/10 transition-all'
              >
                <div className='flex flex-col sm:flex-row sm:items-center w-full gap-2 sm:gap-4'>
                  <div className='flex items-center gap-1 min-w-[200px]'>
                    <CopyAddressButton
                      address={participant.user_address}
                      size={12}
                    />
                    <DisplayAddress
                      chain={chain}
                      address={participant.user_address}
                    />
                  </div>
                  <div className='text-sm text-white/60'>
                    {formatEther(BigInt(participant.amount))} {chain.currency}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className='p-4 text-white/60'>Loading addresses…</div>
          )}
        </div>
      )}
    </div>
  );
}
