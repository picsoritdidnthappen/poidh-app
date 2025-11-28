import React, { useState } from 'react';
import FormJoinBounty from './FormJoinBounty';
import ButtonCTA from '../global/ButtonCTA';
import { PlusIcon } from '@/components/global/Icons';
import { useAccount } from 'wagmi';
import { trpc } from '@/trpc/client';
import { useGetChain } from '@/hooks/useGetChain';
import { toast } from 'react-toastify';

export default function JoinBounty({ bountyId }: { bountyId: string }) {
  const [showForm, setShowForm] = useState(false);
  const account = useAccount();
  const chain = useGetChain();

  const bounty = trpc.bounty.useQuery({
    id: Number(bountyId),
    chainId: chain.id,
  });

  return (
    <>
      <FormJoinBounty
        bountyId={bountyId}
        open={showForm}
        onClose={() => setShowForm(false)}
      />
      <div className='w-fit cursor-pointer'>
        <div
          onClick={() => {
            if (
              account.address?.toLowerCase() ===
              bounty.data?.issuer.toLowerCase()
            ) {
              toast.error(
                'bounty creators cannot add funds to their own bounty - if you must add funds, please do so via a separate wallet'
              );
              return;
            }
            setShowForm(true);
          }}
        >
          <ButtonCTA>
            add funds <PlusIcon size={15} />
          </ButtonCTA>
        </div>
      </div>
    </>
  );
}
