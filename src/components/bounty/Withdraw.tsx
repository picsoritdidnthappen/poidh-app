import Loading from '@/components/global/Loading';
import abi from '@/constant/abi/abi';
import { useGetChain } from '@/hooks/useGetChain';
import { trpc, trpcClient } from '@/trpc/client';
import { useMutation } from '@tanstack/react-query';
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useAccount, useSwitchChain, useWriteContract } from 'wagmi';

export default function Withdraw({ bountyId }: { bountyId: string }) {
  const chain = useGetChain();
  const account = useAccount();
  const writeContract = useWriteContract({});
  const switctChain = useSwitchChain();
  const [status, setStatus] = useState<string>('');
  const utils = trpc.useUtils();

  const withdrawFromOpenBountyMutation = useMutation({
    mutationFn: async (bountyId: bigint) => {
      const chainId = await account.connector?.getChainId();
      if (chain.id !== chainId) {
        await switctChain.switchChainAsync({ chainId: chain.id });
      }
      setStatus('Waiting approval');
      await writeContract.writeContractAsync({
        abi,
        chainId: chain.id,
        address: chain.contracts.mainContract as `0x${string}`,
        functionName: 'withdrawFromOpenBounty',
        args: [bountyId],
      });

      for (let i = 0; i < 60; i++) {
        setStatus('Indexing ' + i + 's');
        const participant = await trpcClient.isWithdrawBounty.query({
          bountyId: Number(bountyId),
          chainId: chain.id,
          participantAddress: account.address!,
        });
        if (!participant) {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }

      throw new Error('Failed to withdraw');
    },
    onSuccess: () => {
      toast.success('Bounty withdrawn successfully');
    },
    onError: (error) => {
      toast.error('Failed to withdraw bounty:' + error.message);
    },
    onSettled: () => {
      utils.participations.refetch();
    },
  });

  return (
    <>
      <Loading
        open={withdrawFromOpenBountyMutation.isPending}
        status={status}
      />
      <div className=' py-12 w-fit '>
        <button
          className='border border-white rounded-full px-5 py-2  backdrop-blur-sm bg-white/30 hover:bg-white/40'
          onClick={() => {
            if (account.address) {
              withdrawFromOpenBountyMutation.mutate(BigInt(bountyId));
            } else {
              toast.error('Please fill in all fields and connect wallet');
            }
          }}
        >
          withdraw
        </button>
      </div>
    </>
  );
}
