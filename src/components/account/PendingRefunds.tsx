'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { trpc, trpcClient } from '@/trpc/client';
import { getChainById } from '@/utils/config';
import { ChainId } from '@/utils/types';
import { CloseIcon } from '@/components/global/Icons';
import DynamicChainIcon from '@/components/global/DynamicChainIcon';
import { useAccount, useSwitchChain, useWriteContract } from 'wagmi';
import { useMutation } from '@tanstack/react-query';
import { useSetAtom, useAtomValue } from 'jotai';
import { pollingChainIdAtom, setLoadingAtom } from '@/store/loading';
import { toast } from 'react-toastify';
import abi from '@/constant/abi/abi';

type PendingRefund = {
  bountyId: number;
  onChainId: number;
  chainId: number;
  title: string;
  description: string | null;
};

export default function PendingRefunds({ address }: { address: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const account = useAccount();
  const writeContract = useWriteContract({});
  const switchChain = useSwitchChain();
  const setLoading = useSetAtom(setLoadingAtom);
  const setPollingChainId = useSetAtom(pollingChainIdAtom);
  const pollingChainId = useAtomValue(pollingChainIdAtom);
  const utils = trpc.useUtils();

  const pendingRefunds = trpc.accounts.pendingRefunds.useQuery(
    { address: address as `0x${string}` },
    { enabled: !!address }
  );

  const claimRefundMutation = useMutation({
    mutationFn: async (refund: PendingRefund) => {
      const chain = getChainById({ chainId: refund.chainId as ChainId });

      const chainId = await account.connector?.getChainId();
      if (chain.id !== chainId) {
        setLoading({ isLoading: true, status: 'Switching network' });
        await switchChain.switchChainAsync({ chainId: chain.id });
      }

      setPollingChainId(chain.id);
      setLoading({ isLoading: true, status: 'Waiting approval' });
      await writeContract.writeContractAsync({
        abi,
        chainId: chain.id,
        address: chain.contracts.mainContract as `0x${string}`,
        functionName: 'claimRefundFromCancelledOpenBounty',
        args: [BigInt(refund.onChainId)],
      });

      for (let i = 0; i < 180; i++) {
        setLoading({ isLoading: true, status: 'Indexing ' + i + 's' });
        if (!account.address) throw new Error('Wallet not connected');
        const claimed = await trpcClient.accounts.hasClaimedRefund.query({
          address: account.address,
          bountyId: refund.bountyId,
          chainId: pollingChainId ?? chain.id,
        });
        if (claimed) return;
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
      utils.accounts.pendingRefunds.invalidate();
      setLoading({ isLoading: false, status: '' });
      setPollingChainId(null);
    },
  });

  if (!pendingRefunds.data?.length) return null;

  return (
    <>
      <div className='my-2 sm:mt-0 lg:ml-6 rounded-lg flex flex-col items-center justify-center w-full gap-2'>
        <button
          type='button'
          onClick={() => setIsModalOpen(true)}
          className="w-full px-6 py-2 rounded-lg bg-poidhRed text-white text-base font-['PixeloidSans'] lowercase tracking-wider shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-white/30"
        >
          claim refunds
        </button>
        <div className='text-xs text-white/60'>
          {pendingRefunds.data.length}{' '}
          {pendingRefunds.data.length === 1 ? 'bounty' : 'bounties'} pending
        </div>
      </div>

      <Dialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        className='relative z-50'
      >
        <div className='fixed inset-0 bg-black/30 flex items-center justify-center p-4'>
          <DialogPanel className='w-[calc(100vw-2rem)] sm:w-[550px] max-w-[550px] rounded-xl p-6 bg-poidhBlue dark:bg-[#132b47] border border-[#D1ECFF]'>
            <div className='relative mb-6'>
              <DialogTitle className="font-['PixeloidSans'] text-xl text-poidhRed text-center [text-shadow:-0.5px_-0.5px_0_white,0.5px_-0.5px_0_white,-0.5px_0.5px_0_white,0.5px_0.5px_0_white]">
                claim your refunds
              </DialogTitle>
              <button
                onClick={() => setIsModalOpen(false)}
                className='absolute -top-2 -right-2 text-white hover:text-white/70 transition-colors focus:outline-none'
              >
                <CloseIcon size={12} />
              </button>
            </div>

            <div className='flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1'>
              {pendingRefunds.data.map((refund) => {
                const chain = getChainById({
                  chainId: refund.chainId as ChainId,
                });
                return (
                  <div
                    key={`${refund.bountyId}-${refund.chainId}`}
                    className='flex items-center gap-4 p-4 bg-white/10 rounded-lg hover:bg-white/15 transition-colors'
                  >
                    <Link
                      href={`/${chain.slug}/bounty/${refund.bountyId}`}
                      className='flex items-center gap-4 flex-1 min-w-0'
                      onClick={() => setIsModalOpen(false)}
                    >
                      <div className='flex-shrink-0'>
                        <DynamicChainIcon chain={chain.slug} size={24} />
                      </div>
                      <div className='min-w-0'>
                        <div className='text-white text-base font-semibold truncate'>
                          {refund.title}
                        </div>
                        <div className='text-white/60 text-sm truncate'>
                          {refund.description
                            ? refund.description.slice(0, 60) +
                              (refund.description.length > 60 ? '…' : '')
                            : chain.slug}
                        </div>
                      </div>
                    </Link>
                    <button
                      onClick={() => claimRefundMutation.mutate(refund)}
                      disabled={claimRefundMutation.isPending}
                      className='px-3 py-2 rounded-lg bg-poidhRed text-white text-sm lowercase tracking-wider hover:bg-[#FF3737] transition-colors focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-50'
                    >
                      refund
                    </button>
                  </div>
                );
              })}
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
