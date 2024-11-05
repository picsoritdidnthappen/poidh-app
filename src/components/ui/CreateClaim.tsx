import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import GameButton from '@/components/global/GameButton';
import ButtonCTA from '@/components/ui/ButtonCTA';
import FormClaim from '@/components/global/FormClaim';

export default function CreateClaim({ bountyId }: { bountyId: string }) {
  const [showForm, setShowForm] = useState(false);
  const { isConnected } = useAccount();

  return (
    <div className='fixed bottom-8 z-40 w-[91%] flex justify-center items-center lg:flex-col'>
      {isConnected && !showForm && (
        <div
          className='absolute button bottom-10 flex cursor-pointer flex-col items-center justify-center'
          onClick={() => setShowForm(true)}
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
