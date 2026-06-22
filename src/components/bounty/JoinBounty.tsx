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
      <button
        type='button'
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
        className='group relative w-fit cursor-pointer focus:outline-none'
        aria-label='add funds to this bounty'
      >
        <span className='absolute inset-0 rounded-full bg-poidhRed/40 translate-y-[2px] transition-transform group-hover:translate-y-[3px] group-active:translate-y-0' />
        <span className='relative flex items-center whitespace-nowrap gap-x-2 rounded-full px-5 py-2 border border-poidhRed/60 bg-[#1c4775] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-150 group-hover:-translate-y-[1px] group-hover:bg-[#1f5285] group-active:translate-y-[1px]'>
          add funds <PlusIcon size={15} />
        </span>
      </button>
    </>
  );
}
