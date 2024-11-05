import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import Form from '@/components/global/Form';
import GameButton from '@/components/global/GameButton';
import ButtonCTA from '@/components/ui/ButtonCTA';

export default function CreateBounty() {
  const [showForm, setShowForm] = useState(false);
  const { isConnected } = useAccount();

  return (
    <div className='fixed bottom-8 z-40 w-full flex justify-center items-center lg:flex-col'>
      {isConnected && !showForm && (
        <div
          className='absolute button bottom-10 flex cursor-pointer flex-col items-center justify-center'
          onClick={() => setShowForm(true)}
        >
          <GameButton />
          <ButtonCTA>create bounty</ButtonCTA>
        </div>
      )}

      {showForm && (
        <div className='md:w-auto lg:top-5 relative'>
          <button
            onClick={() => setShowForm(false)}
            className='absolute right-0 border border-[#D1ECFF] backdrop-blur-sm bg-white/30 rounded-full p-2'
          >
            <svg
              width='14'
              height='14'
              viewBox='0 0 14 14'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                d='M13 1L1 13M1 1L13 13'
                stroke='white'
                strokeWidth='2'
                stroke-linecap='round'
                stroke-linejoin='round'
              />
            </svg>
          </button>
          <Form />
        </div>
      )}
    </div>
  );
}
