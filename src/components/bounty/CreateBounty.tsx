import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import GameButton from '@/components/global/GameButton';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import ButtonCTA from '../global/ButtonCTA';
import FormBounty from './FormBounty';

export default function CreateBounty() {
  const { openConnectModal } = useConnectModal();
  const [showForm, setShowForm] = useState(false);
  const account = useAccount();

  return (
    <div className='fixed bottom-8 z-40 w-full flex justify-center items-center lg:flex-col'>
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
          <ButtonCTA>create bounty</ButtonCTA>
        </div>
      )}
      <FormBounty open={showForm} onClose={() => setShowForm(false)} />
    </div>
  );
}
