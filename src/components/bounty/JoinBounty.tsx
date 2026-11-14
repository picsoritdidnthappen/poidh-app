import { useState } from 'react';
import FormJoinBounty from './FormJoinBounty';
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
      <div
        className='poidh-funding-gradient flex w-fit cursor-pointer items-center gap-x-2 whitespace-nowrap rounded-2xl border px-5 py-2 text-sm font-semibold'
        onClick={() => {
          if (
            account.address?.toLowerCase() === bounty.data?.issuer.toLowerCase()
          ) {
            toast.error(
              'bounty creators cannot add funds to their own bounty - if you must add funds, please do so via a separate wallet'
            );
            return;
          }
          setShowForm(true);
        }}
      >
        <PlusIcon size={15} /> add funds
      </div>
    </>
  );
}
