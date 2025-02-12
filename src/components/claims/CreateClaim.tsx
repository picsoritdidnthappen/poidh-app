import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import GameButton from '@/components/global/GameButton';
import { useGetChain } from '@/hooks/useGetChain';
import { trpc } from '@/trpc/client';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import FormClaim from './FormClaim';
import ButtonCTA from '../global/ButtonCTA';

export default function CreateClaim({ bountyId }: { bountyId: string }) {
  const chain = useGetChain();
  const [showForm, setShowForm] = useState(false);
  const account = useAccount();
  const { openConnectModal } = useConnectModal();

  const bounty = trpc.bounty.useQuery({
    id: Number(bountyId),
    chainId: chain.id,
  });

  if (!bounty.data?.inProgress) {
    return null;
  }

  return (
    <div className='fixed bottom-8 z-40 w-full flex justify-center items-center'>
      {!showForm && (
        <div
          className='absolute button -bottom-3 flex cursor-pointer flex-col items-center justify-center'
          onClick={() => {
            if (account.address) {
              setShowForm(true);
              return;
            }
            openConnectModal?.();
          }}
        >
          <GameButton />
          <ButtonCTA>create claim</ButtonCTA>
        </div>
      )}
      <FormClaim
        bountyId={bountyId}
        onClose={() => setShowForm(false)}
        open={showForm}
      />
    </div>
  );
}
