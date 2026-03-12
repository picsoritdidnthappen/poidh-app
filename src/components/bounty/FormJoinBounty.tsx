import abi from '@/constant/abi/abi';
import { useChainInfo } from '@/hooks/useChainInfo';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { parseEther } from 'viem';
import { useAccount, useSwitchChain, useWriteContract } from 'wagmi';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { trpc, trpcClient } from '@/trpc/client';
import { useAtomValue, useSetAtom } from 'jotai';
import { setLoadingAtom, pollingChainIdAtom } from '@/store/loading';
import { cn, formatAmountShort } from '@/utils/utils';
import JoinBountySuccessModal from './JoinBountySuccessModal';
import { DEGEN_MIN_AMOUNT, ETH_MIN_AMOUNT } from '@/utils/constants';
import { CloseIcon } from '@/components/global/Icons';

export default function FormJoinBounty({
  id,
  onChainId,
  open,
  onClose,
}: {
  id: number;
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
    if (raw.split(/[.,]/)[0].length > 20) return;
    const value = Number(raw);

    setAmount(raw);
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
          <DialogPanel className='w-full max-w-xs rounded-lg p-6 bg-poidhBlue/90 border border-[#D1ECFF] text-white relative'>
            <button
              onClick={() => {
                onClose();
                setUsdPerToken(null);
                setAmount('');
              }}
              className='absolute top-4 right-4 text-white/80 hover:text-white transition-colors'
            >
              <CloseIcon size={12} />
            </button>
            <div className='flex flex-col items-start w-full'>
              <DialogTitle className='text-base mb-2 font-family-geist'>
                boost this bounty 📈
              </DialogTitle>

              <p className='text-sm text-white/90 mb-3'>
                increase the reward to help this bounty get completed
              </p>

              <div className='w-full mb-5 p-3 rounded-md bg-white/5 border border-white/10 text-xs text-white/80 leading-relaxed space-y-1'>
                <div>
                  • funds aren’t locked — you can withdraw anytime before a winner is proposed
                </div>
                <div>
                  • once a winner is proposed, you will have <b>48 hours</b> to approve or veto the claim
                  <span className="block opacity-80">(voting power proportional to funds added)</span>
                </div>
              </div>
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
                    (${formatAmountShort({ amount: usdPerToken })})
                  </span>
                )}
              </div>
            </div>
            <button
              disabled={!amount}
              onClick={() => {
                if (account.address) {
                  const minValue =
                    chain.currency === 'degen'
                      ? DEGEN_MIN_AMOUNT
                      : ETH_MIN_AMOUNT;

                  if (Number(amount) < minValue) {
                    toast.error(
                      `minimum amount is ${minValue} ${chain.currency.toUpperCase()}`
                    );
                    return;
                  }

                  onClose();
                  setUsdPerToken(null);
                  bountyMutation.mutate();
                } else {
                  toast.error('Please connect wallet to continue');
                }
              }}
              className={cn(
                'w-full relative group',
                !amount && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div className='absolute inset-0 bg-[#cf5d5d] rounded-md transform translate-y-[2px]'></div>
              <div className='relative bg-poidhRed text-white py-2 px-3 rounded-md  transition-all text-sm duration-75 group-hover:-translate-y-[1px] group-active:translate-y-[2px] flex items-center justify-center gap-1.5 border-2 border-t-[#ff6e6e] border-l-[#ff6e6e] border-r-[#cf5d5d] border-b-[#cf5d5d]'>
                <span className='drop-shadow-[1px_1px_0px_rgba(0,0,0,0.5)] tracking-wide'>
                  boost bounty
                </span>
              </div>
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
