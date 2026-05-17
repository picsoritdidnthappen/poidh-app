'use client';

import { useState } from 'react';
import { formatAmountShort } from '@/utils/utils';
import { toast } from 'react-toastify';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import DynamicChainIcon from '@/components/global/DynamicChainIcon';
import { CloseIcon } from '@/components/global/Icons';
import { Chain } from '@/utils/types';
import { chains } from '@/utils/config';
import { useMutation } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { pollingChainIdAtom, setLoadingAtom } from '@/store/loading';
import { useAccount, useSwitchChain, useWriteContract } from 'wagmi';
import abi from '@/constant/abi/abi';
import { decodeEventLog } from 'viem';
import { trpcClient } from '@/trpc/client';

type FundToClaim = {
  chain: Chain;
  amount: number;
  currency: string;
};

type User = {
  address: string;
  withdrawalBase: number;
  withdrawalArbitrum: number;
  withdrawalDegen: number;
  withdrawalMainnet: number;
};

export default function ClaimFundsButton({ user }: { user: User }) {
  const account = useAccount();
  const setLoading = useSetAtom(setLoadingAtom);
  const switchChain = useSwitchChain();
  const setPollingChainId = useSetAtom(pollingChainIdAtom);
  const writeContract = useWriteContract({});

  const [isModalOpen, setIsModalOpen] = useState(false);

  const fundsToClaim = getFundsToClaim(user);

  const withdrawFundsMutation = useMutation({
    mutationFn: async (chain: Chain) => {
      const chainId = await account.connector?.getChainId();
      if (chain.id !== chainId) {
        setLoading({ isLoading: true, status: 'Switching network...' });
        await switchChain.switchChainAsync({ chainId: chain.id });
      }

      setLoading({ isLoading: true, status: 'Uploading metadata...' });

      setLoading({ isLoading: true, status: 'Claiming funds...' });
      setPollingChainId(chain.id);
      const tx = await writeContract.writeContractAsync({
        abi,
        address: chain.contracts.mainContract as `0x${string}`,
        functionName: 'withdraw',
        args: [],
      });

      setLoading({ isLoading: true, status: 'Waiting for receipt...' });
      const receipt = await chain.provider.waitForTransactionReceipt({
        hash: tx,
      });

      const log = receipt.logs
        .map((log) => {
          try {
            return decodeEventLog({
              abi,
              data: log.data,
              topics: log.topics,
            });
          } catch (e) {
            return null;
          }
        })
        .find((log) => log?.eventName === 'Withdrawal');

      if (!log) {
        throw new Error('No logs found');
      }

      if (log.eventName !== 'Withdrawal') {
        throw new Error('Invalid event: ' + log.eventName);
      }

      for (let i = 0; i < 60; i++) {
        setLoading({ isLoading: true, status: `Indexing ${i}s...` });
        const user = await trpcClient.users.fetchByAddress.query({
          address: account.address as `0x${string}`,
        });

        if (
          (chain.slug === 'degen' && user?.withdrawalDegen === 0) ||
          (chain.slug === 'base' && user?.withdrawalBase === 0) ||
          (chain.slug === 'arbitrum' && user?.withdrawalArbitrum === 0) ||
          (chain.slug === 'mainnet' && user?.withdrawalMainnet === 0)
        ) {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }

      throw new Error('Failed to index bounty');
    },
    onSuccess: () => {
      setLoading({ isLoading: false });
      toast.success('Funds claimed successfully');
      window.location.reload();
    },
    onError: (error) => {
      setLoading({ isLoading: false });
      toast.error('Failed to claim funds: ' + error.message);
    },
    onSettled: () => {
      setPollingChainId(null);
      setIsModalOpen(false);
    },
  });

  if (fundsToClaim.length === 0) {
    return null;
  }

  return (
    <>
      <div className='my-2 sm:mt-0 lg:ml-6 rounded-lg flex flex-col items-center justify-center w-full gap-2'>
        <button
          type='button'
          onClick={() => setIsModalOpen(true)}
          className="w-full px-6 py-2 rounded-lg bg-poidhRed text-white text-base font-['PixeloidSans'] lowercase tracking-wider shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-white/30"
        >
          claim funds
        </button>
        <div className='text-xs text-white/60'>
          <>
            {(user.withdrawalBase > 0 ||
              user.withdrawalArbitrum > 0 ||
              user.withdrawalMainnet > 0) && (
              <span className='font-medium'>
                {formatAmountShort({
                  amount:
                    user.withdrawalBase +
                    user.withdrawalArbitrum +
                    user.withdrawalMainnet,
                  precision: 5,
                })}{' '}
                ETH
              </span>
            )}
            {(user.withdrawalBase > 0 ||
              user.withdrawalArbitrum > 0 ||
              user.withdrawalMainnet > 0) &&
              user.withdrawalDegen > 0 && <span className='mx-2'>&</span>}
            {user.withdrawalDegen > 0 && (
              <span className='font-medium'>
                {formatAmountShort({ amount: user.withdrawalDegen })} DEGEN
              </span>
            )}
          </>
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
                claim your funds
              </DialogTitle>
              <button
                onClick={() => setIsModalOpen(false)}
                className='absolute -top-2 -right-2 text-white hover:text-white/70 transition-colors focus:outline-none'
              >
                <CloseIcon size={12} />
              </button>
            </div>

            <div className='flex flex-col gap-3'>
              {fundsToClaim.map((option, index) => (
                <div
                  key={index}
                  className='flex items-center gap-4 p-4 bg-white/10 rounded-lg hover:bg-white/15 transition-colors'
                >
                  <div className='flex-shrink-0'>
                    <DynamicChainIcon chain={option.chain.slug} size={24} />
                  </div>

                  <div className='flex-1'>
                    <div className='text-white text-base font-semibold'>
                      {formatAmountShort({
                        amount: option.amount,
                        precision: 5,
                      })}{' '}
                      {option.currency}
                    </div>
                    <div className='text-white/60 text-sm'>
                      from {option.chain.slug}
                    </div>
                  </div>

                  <button
                    onClick={() => withdrawFundsMutation.mutate(option.chain)}
                    className='px-3 py-2 rounded-lg bg-poidhRed text-white text-sm lowercase tracking-wider hover:bg-[#FF3737] transition-colors focus:outline-none focus:ring-2 focus:ring-white/30'
                  >
                    claim
                  </button>
                </div>
              ))}
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}

function getFundsToClaim(user: User): FundToClaim[] {
  const claimOptions: FundToClaim[] = [];

  if (user.withdrawalBase > 0) {
    claimOptions.push({
      chain: chains.base,
      amount: user.withdrawalBase,
      currency: 'ETH',
    });
  }

  if (user.withdrawalArbitrum > 0) {
    claimOptions.push({
      chain: chains.arbitrum,
      amount: user.withdrawalArbitrum,
      currency: 'ETH',
    });
  }

  if (user.withdrawalDegen > 0) {
    claimOptions.push({
      chain: chains.degen,
      amount: user.withdrawalDegen,
      currency: 'DEGEN',
    });
  }

  if (user.withdrawalMainnet > 0) {
    claimOptions.push({
      chain: chains.mainnet,
      amount: user.withdrawalMainnet,
      currency: 'ETH',
    });
  }

  return claimOptions;
}
