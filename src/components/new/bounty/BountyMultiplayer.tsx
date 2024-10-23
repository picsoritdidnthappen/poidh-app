/* eslint-disable simple-import-sort/imports */
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import Link from 'next/link';
import { useState } from 'react';
import { formatEther } from 'viem';

import { ExpandMoreIcon } from '@/components/new/global/Icons';
import JoinBounty from '@/components/new/ui/JoinBounty';
import Withdraw from '@/components/new/ui/Withdraw';
import { trpc } from '@/trpc/client';
import { Chain } from '@/types/new/web3';

export default function BountyMultiplayer({
  chain,
  bountyId,
  inProgress,
  issuer,
  isCanceled,
}: {
  chain: Chain;
  bountyId: string;
  inProgress: boolean;
  issuer: string;
  isCanceled: boolean;
}) {
  const [showParticipants, setShowParticipants] = useState(false);
  const { primaryWallet } = useDynamicContext();

  const { data, isSuccess } = trpc.participants.useQuery({
    bountyId: bountyId,
    chainId: chain.id.toString(),
  });

  const toggleParticipants = () => {
    setShowParticipants(!showParticipants);
  };

  const isCurrentUserAParticipant = data?.some(
    (participant) => participant.user.id === primaryWallet?.address
  );

  return (
    <>
      <div>
        <div></div>
        <button
          onClick={toggleParticipants}
          className='border border-white rounded-full mt-5  px-5 py-2 flex justify-between items-center backdrop-blur-sm bg-[#D1ECFF]/20 w-fit'
        >
          {data ? `${data.length} contributors` : 'Loading contributors...'}
          <span
            className={`${
              showParticipants ? '-rotate-180' : ''
            } animation-all duration-300 `}
          >
            <ExpandMoreIcon width={16} height={16} />
          </span>
        </button>

        {showParticipants && (
          <div className='border mt-5 border-white rounded-[8px] px-10 lg:px-5 py-2 flex justify-between items-center backdrop-blur-sm bg-[#D1ECFF]/20 w-fit'>
            <div className='flex flex-col'>
              {isSuccess ? (
                data.map((participant, index) => {
                  const formattedAddress = `${participant.user.id.substring(
                    0,
                    6
                  )}...${participant.user.id.substring(
                    participant.user.id.length - 3
                  )}`;
                  const degenOrEnsName =
                    participant.user.degenName || participant.user.ens;
                  const displayText = degenOrEnsName || formattedAddress;

                  return (
                    <div className='py-2' key={index}>
                      <Link
                        href={`/new/${chain.chainPathName}/account/${participant.user.id}`}
                      >
                        {displayText}
                      </Link>{' '}
                      - {formatEther(BigInt(participant.amount))}{' '}
                      {chain.currency}
                    </div>
                  );
                })
              ) : (
                <p>Loading addresses…</p>
              )}
            </div>
          </div>
        )}
      </div>
      <div>
        {isCurrentUserAParticipant &&
          inProgress &&
          primaryWallet?.address !== issuer && <Withdraw bountyId={bountyId} />}
      </div>

      <div>
        {!isCurrentUserAParticipant && !isCanceled && (
          <JoinBounty bountyId={bountyId} />
        )}
      </div>
    </>
  );
}
