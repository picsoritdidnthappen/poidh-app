import React, { useState } from 'react';
import FormJoinBounty from './FormJoinBounty';
import ButtonCTA from '../global/ButtonCTA';
import { PlusIcon } from '@/components/global/Icons';

export default function JoinBounty({ bountyId }: { bountyId: string }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <FormJoinBounty
        bountyId={bountyId}
        open={showForm}
        onClose={() => setShowForm(false)}
      />
      <div className='w-fit cursor-pointer'>
        <div onClick={() => setShowForm(true)}>
          <ButtonCTA>
            add funds <PlusIcon size={15} />
          </ButtonCTA>
        </div>
      </div>
    </>
  );
}
