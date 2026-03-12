import { useState } from 'react';
import FormJoinBounty from './FormJoinBounty';
import ButtonCTA from '../global/ButtonCTA';
import { PlusIcon } from '@/components/global/Icons';
import { useAccount } from 'wagmi';
import { trpc } from '@/trpc/client';
import { useChainInfo } from '@/hooks/useChainInfo';
import { toast } from 'react-toastify';

export default function JoinBounty({ bountyId }: { bountyId: number }) {
  const [showForm, setShowForm] = useState(false);
  const account = useAccount();
  const chain = useChainInfo();

  const bounty = trpc.bounties.fetch.useQuery({
    id: Number(bountyId),
    chainId: chain.id,
  });

  if (!bounty.data) {
    return null;
  }

  return (
    <>
      <FormJoinBounty
        id={bounty.data.id}
        onChainId={bounty.data.onChainId}
        currentAmount={bounty.data.amount}
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
