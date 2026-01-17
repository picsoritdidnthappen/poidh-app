import abi from '@/constant/abi/abi';
import { useChainInfo } from '@/hooks/useGetChain';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { parseEther } from 'viem';
import { useAccount, useSwitchChain, useWriteContract } from 'wagmi';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { cn } from '@/utils';
import { trpc, trpcClient } from '@/trpc/client';
import { useAtomValue, useSetAtom } from 'jotai';
import { setLoadingAtom, pollingChainIdAtom } from '@/store/loading';
import { formatAmountShort } from '@/utils/utils';
import JoinBountySuccessModal from './JoinBountySuccessModal';

export default function FormJoinBounty({
  id,
  onChainId,
  open,
  onClose,
}: {
  id: string;
  onChainId: number;
  open: boolean;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState<string>('');
  const [usdPerToken, setUsdPerToken] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const utils = trpc.useUtils();

  const account = useAccount();
  const writeContract = useWriteContract({});
  const chain = useChainInfo();
  const switchChain = useSwitchChain();
  const setLoading = useSetAtom(setLoadingAtom);
  const setPollingChainId = useSetAtom(pollingChainIdAtom);
  const pollingChainId = useAtomValue(pollingChainIdAtom);

  const price =
    trpc.web3.fetchPrice.useQuery({ currency: chain.currency }).data ?? 0;

  const bountyMutation = useMutation({
    mutationFn: async () => {
      const walletChainId = await account.connector?.getChainId();

      if (chain.id !== walletChainId) {
        setLoading({ isLoading: true, status: 'Switching network...' });
        await switchChain.switchChainAsync({ chainId: chain.id });
      }

      setLoading({ isLoading: true, status: 'Waiting approval' });
      setPollingChainId(chain.id);
      await writeContract.writeContractAsync({
        abi,
        address: chain.contracts.mainContract as `0x${string}`,
        value: BigInt(parseEther(amount)),
        functionName: 'joinOpenBounty',
        args: [BigInt(onChainId)],
        chainId: chain.id,
      });

      for (let i = 0; i < 60; i++) {
        setLoading({ isLoading: true, status: `Indexing ${i}s...` });
        if (!account.address) {
          throw new Error('No wallet address found');
        }
        const participant = await trpcClient.bounties.isJoined.query({
          bountyId: Number(id),
          chainId: pollingChainId ?? chain.id,
          participantAddress: account.address,
        });
        if (participant) {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }

      throw new Error('Failed to join bounty');
    },
    onSuccess: () => {
      setShowSuccess(true);
    },
    onError: (error) => {
      toast.error('Failed to join bounty: ' + error.message);
      setAmount('');
    },
    onSettled: () => {
      setPollingChainId(null);
      setLoading({ isLoading: false, status: '' });
    },
  });

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    const integerPart = raw.split(/[.,]/)[0];
    if (integerPart.length > 20) return;

    setAmount(raw);
    const value = Number(raw);
    if (!isNaN(value) && value > 0) {
      setUsdPerToken(parseFloat((value * price).toFixed(2)));
    } else {
      setUsdPerToken(null);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={() => {
          onClose();
          setUsdPerToken(null);
          setAmount('');
        }}
        className='relative z-50'
      >
        <div className='fixed inset-0 bg-black/30 flex items-center justify-center p-4'>
          <DialogPanel className='w-full max-w-xs rounded-lg p-6 bg-poidhBlue/90 border border-[#D1ECFF] text-white'>
            <div className='flex flex-col items-start w-full'>
              <DialogTitle className='text-base mb-2 font-family-geist'>
                Reward
              </DialogTitle>
              <div className='relative w-full mb-6'>
                <input
                  type='number'
                  step='any'
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder={`amount in ${chain.currency}`}
                  className='border bg-transparent border-[#D1ECFF] py-2 px-2 rounded-md w-full pr-28 placeholder:text-slate-400 whitespace-nowrap'
                />
                {usdPerToken !== null && (
                  <span className='absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 font-semibold pointer-events-none max-w-[120px] truncate text-right'>
                    (${formatAmountShort(usdPerToken)})
                  </span>
                )}
              </div>
            </div>
            <button
              className={cn(
                'w-full rounded-full lowercase bg-poidhRed hover:bg-red-400 text-white font-family-geist py-2 px-4 border border-transparent transition-colors',
                !amount && 'opacity-50 cursor-not-allowed'
              )}
              disabled={!amount}
              onClick={() => {
                if (account.address) {
                  onClose();
                  bountyMutation.mutate();
                } else {
                  toast.error('Please connect wallet to continue');
                }
              }}
            >
              add funds
            </button>
          </DialogPanel>
        </div>
      </Dialog>
      <JoinBountySuccessModal
        open={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          setAmount('');
          utils.bounties.participations.refetch();
        }}
        joinedAmount={amount}
        bountyId={id}
      />
    </>
  );
}
