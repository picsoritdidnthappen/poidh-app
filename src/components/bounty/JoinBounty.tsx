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
        className='flex items-center whitespace-nowrap gap-x-2 rounded-2xl px-5 py-2 text-sm font-semibold cursor-pointer bg-gradient-to-r from-poidhRed/35 to-[#158ad6]/50 text-white border border-white/20 hover:from-poidhRed/45 hover:to-[#158ad6]/60 transition-all duration-200 w-fit'
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
