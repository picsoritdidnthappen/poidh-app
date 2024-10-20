import React, { useState } from 'react';

import FormJoinBounty from '@/components/new/global/FormJoinBounty';
import ButtonCTA from '@/components/new/ui/ButtonCTA';

export default function JoinBounty({ bountyId }: { bountyId: string }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className=' py-12 w-fit '>
      <div onClick={() => setShowForm(!showForm)}>
        {!showForm && <ButtonCTA> join bounty </ButtonCTA>}
      </div>
      {showForm && (
        <div className=' mt-5'>
          <button
            onClick={() => setShowForm(!showForm)}
            className=' border border-[#D1ECFF] backdrop-blur-sm bg-white/30 rounded-full p-2'
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
                stroke-width='2'
                stroke-linecap='round'
                stroke-linejoin='round'
              />
            </svg>
          </button>
          <FormJoinBounty bountyId={bountyId} />
        </div>
      )}
    </div>
  );
}
