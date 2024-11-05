import { useState } from 'react';

import { ExpandMoreIcon } from '@/components/global/Icons';
import JoinBounty from '@/components/ui/JoinBounty';
import Withdraw from '@/components/ui/Withdraw';
import { trpc } from '@/trpc/client';
import { Chain } from '@/utils/types';
import { useAccount } from 'wagmi';
import DisplayAddress from '@/components/DisplayAddress';
import { formatEther } from 'viem';
import { cn } from '@/utils';

export default function BountyMultiplayer({
  chain,
  bountyId,
  inProgress,
  issuer,
}: {
  chain: Chain;
  bountyId: string;
  inProgress: boolean;
  issuer: string;
}) {
  const [showParticipants, setShowParticipants] = useState(false);
  const account = useAccount();

  const participants = trpc.participants.useQuery(
    {
      bountyId: bountyId,
      chainId: chain.id.toString(),
    },
    {
      enabled: !!bountyId,
    }
  );

  const isCurrentUserAParticipant = participants.data?.some(
    (participant) => participant.user.id === account.address
  );

  return (
    <>
      <div>
        <button
          onClick={() => setShowParticipants(!showParticipants)}
          className='border border-white rounded-full mt-5  px-5 py-2 flex justify-between items-center backdrop-blur-sm bg-[#D1ECFF]/20 w-fit'
        >
          {participants.data
            ? `${participants.data.length} contributors`
            : 'Loading contributors...'}
          <span
            className={cn(
              showParticipants ? '-rotate-180' : '',
              'animation-all duration-300'
            )}
          >
            <ExpandMoreIcon width={16} height={16} />
          </span>
        </button>

        {showParticipants && (
          <div className='border mt-5 border-white rounded-[8px] px-10 lg:px-5 py-2 flex justify-between items-center backdrop-blur-sm bg-[#D1ECFF]/20 w-fit'>
            <div className='flex flex-col'>
              {participants.isSuccess ? (
                participants.data.map((participant) => (
                  <p key={participant.user.id} className='flex items-center'>
                    <DisplayAddress
                      address={participant.user.id}
                      chain={chain}
                    />
                    &nbsp;
                    {`${formatEther(BigInt(participant.amount))} ${
                      chain.currency
                    }`}
                  </p>
                ))
              ) : (
                <p>Loading addresses…</p>
              )}
            </div>
          </div>
        )}
      </div>
      {account.address !== issuer ? (
        inProgress && isCurrentUserAParticipant ? (
          <Withdraw bountyId={bountyId} />
        ) : (
          <JoinBounty bountyId={bountyId} />
        )
      ) : null}
    </>
  );
}
