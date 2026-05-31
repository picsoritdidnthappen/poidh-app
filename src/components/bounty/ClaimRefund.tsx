import abi from '@/constant/abi/abi';
import { RefundIcon } from '@/components/global/Icons';
import ButtonCTA from '@/components/global/ButtonCTA';
import { useChainInfo } from '@/hooks/useChainInfo';
import { setLoadingAtom } from '@/store/loading';
import { trpc, trpcClient } from '@/trpc/client';
import { useMutation } from '@tanstack/react-query';
import { useSetAtom, useAtomValue } from 'jotai';
import { toast } from 'react-toastify';
import { useAccount, useSwitchChain, useWriteContract } from 'wagmi';
import { pollingChainIdAtom } from '@/store/loading';
import type { Chain } from '@/utils/types';

export default function ClaimRefund({
  id,
  onChainId,
  chainOverride,
}: {
  id: number;
  onChainId: number;
  chainOverride?: Chain;
}) {
  const chainFromUrl = useChainInfo();
  const chain = chainOverride ?? chainFromUrl;
  const account = useAccount();
  const writeContract = useWriteContract({});
  const switctChain = useSwitchChain();
  const utils = trpc.useUtils();
  const setLoading = useSetAtom(setLoadingAtom);
  const setPollingChainId = useSetAtom(pollingChainIdAtom);
  const pollingChainId = useAtomValue(pollingChainIdAtom);

  const claimRefundMutation = useMutation({
    mutationFn: async () => {
      const chainId = await account.connector?.getChainId();
      if (chain.id !== chainId) {
        setLoading({ isLoading: true, status: 'Switching network' });
        await switctChain.switchChainAsync({ chainId: chain.id });
      }

      setPollingChainId(chain.id);
      setLoading({ isLoading: true, status: 'Waiting approval' });
      await writeContract.writeContractAsync({
        abi,
        chainId: chain.id,
        address: chain.contracts.mainContract as `0x${string}`,
        functionName: 'claimRefundFromCancelledOpenBounty',
        args: [BigInt(onChainId)],
      });

      for (let i = 0; i < 180; i++) {
        setLoading({ isLoading: true, status: 'Indexing ' + i + 's' });
        if (!account.address) {
          throw new Error('Wallet not connected');
        }
        const claimed = await trpcClient.accounts.hasClaimedRefund.query({
          address: account.address,
          bountyId: Number(id),
          chainId: pollingChainId ?? chain.id,
        });
        if (claimed) {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }

      throw new Error('Failed to claim refund');
    },
    onSuccess: () => {
      toast.success('Refund claimed — funds are now available to withdraw');
    },
    onError: (error) => {
      toast.error('Failed to claim refund: ' + error.message);
    },
    onSettled: () => {
      utils.bounties.participations.refetch();
      utils.accounts.pendingRefunds.invalidate();
      setLoading({ isLoading: false, status: '' });
      setPollingChainId(null);
    },
  });

  return (
    <div
      className='w-fit cursor-pointer'
      onClick={() => {
        if (account.address) {
          claimRefundMutation.mutate();
        } else {
          toast.error('Please connect your wallet');
        }
      }}
    >
      <ButtonCTA>
        refund{' '}
        <span className='text-poidhRed'>
          <RefundIcon size={15} />
        </span>
      </ButtonCTA>
    </div>
  );
}
