import React, { useState } from 'react';
import FormJoinBounty from './FormJoinBounty';
import ButtonCTA from '../global/ButtonCTA';

export default function JoinBounty({ bountyId }: { bountyId: string }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <FormJoinBounty
        bountyId={bountyId}
        open={showForm}
        onClose={() => setShowForm(false)}
      />
      <div className=' py-12 w-fit cursor-pointer'>
        <div onClick={() => setShowForm(true)}>
          <ButtonCTA>join bounty</ButtonCTA>
        </div>
      </div>
    </>
  );
}
