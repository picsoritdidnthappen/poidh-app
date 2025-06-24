import abi from '@/constant/abi/abi';
import { useGetChain } from '@/hooks/useGetChain';
import { setLoadingAtom } from '@/store/loading';
import { trpc, trpcClient } from '@/trpc/client';
import { useMutation } from '@tanstack/react-query';
import { useSetAtom, useAtomValue } from 'jotai';
import React from 'react';
import { toast } from 'react-toastify';
import { useAccount, useSwitchChain, useWriteContract } from 'wagmi';
import { pollingChainIdAtom } from '@/store/loading';

export default function Withdraw({ bountyId }: { bountyId: string }) {
  const chain = useGetChain();
  const account = useAccount();
  const writeContract = useWriteContract({});
  const switctChain = useSwitchChain();
  const utils = trpc.useUtils();
  const setLoading = useSetAtom(setLoadingAtom);
  const setPollingChainId = useSetAtom(pollingChainIdAtom);
  const pollingChainId = useAtomValue(pollingChainIdAtom);

  const withdrawFromOpenBountyMutation = useMutation({
    mutationFn: async (bountyId: bigint) => {
      const chainId = await account.connector?.getChainId();
      if (chain.id !== chainId) {
        setLoading({ isLoading: true, status: 'Swithing network' });
        await switctChain.switchChainAsync({ chainId: chain.id });
      }

      setPollingChainId(chain.id);
      setLoading({ isLoading: true, status: 'Waiting approval' });
      await writeContract.writeContractAsync({
        abi,
        chainId: chain.id,
        address: chain.contracts.mainContract as `0x${string}`,
        functionName: 'withdrawFromOpenBounty',
        args: [bountyId],
      });

      for (let i = 0; i < 180; i++) {
        setLoading({ isLoading: true, status: 'Indexing ' + i + 's' });
        if (!account.address) {
          throw new Error('Wallet not connected');
        }
        const participant = await trpcClient.isWithdrawBounty.query({
          bountyId: Number(bountyId),
          chainId: pollingChainId ?? chain.id,
          participantAddress: account.address,
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
      setLoading({ isLoading: false, status: '' });
      setPollingChainId(null);
    },
  });

  return (
    <>
      <div className='w-fit'>
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
