import { Box, Dialog, DialogContent, Switch } from '@mui/material';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import { useGetChain } from '@/hooks/useGetChain';
import { useAccount, useSwitchChain, useWriteContract } from 'wagmi';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { decodeEventLog, parseEther } from 'viem';
import abi from '@/constant/abi/abi';
import { cn } from '@/utils';
import GameButton from '@/components/global/GameButton';
import { InfoIcon } from '@/components/global/Icons';
import ButtonCTA from '../global/ButtonCTA';
import { useAtomValue, useSetAtom } from 'jotai';
import { pollingChainIdAtom, setLoadingAtom } from '@/store/loading';
import { trpc, trpcClient } from '@/trpc/client';
import { fetchPrice, formatUsdShort } from '@/utils/utils';

export default function FormBounty({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [usdPerToken, setUsdPerToken] = useState<number | null>(null);
  const [isOpenBounty, setIsOpenBounty] = useState(true);
  const [price, setPrice] = useState<number>(0);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const { data: categories } = trpc.categories.useQuery(
    { contains: category },
    {
      enabled: !!category,
      staleTime: 30_000,
    }
  );

  useEffect(() => {
    if (amount) {
      const value = Number(amount);
      if (!isNaN(value) && value > 0) {
        setUsdPerToken(parseFloat((value * price).toFixed(2)));
      }
    }
  }, [price, amount]);
  const chain = useGetChain();
  const writeContract = useWriteContract({});
  const account = useAccount();
  const switctChain = useSwitchChain();
  const router = useRouter();
  const setLoading = useSetAtom(setLoadingAtom);
  const setPollingChainId = useSetAtom(pollingChainIdAtom);
  const pollingChainId = useAtomValue(pollingChainIdAtom);

  useEffect(() => {
    fetchPrice({ currency: chain.currency }).then(setPrice);
  }, [chain.currency]);

  const createBountyMutations = useMutation({
    mutationFn: async (formData: {
      name: string;
      description: string;
      amount: string;
      category: string;
    }) => {
      const chainId = await account.connector?.getChainId();
      if (chain.id !== chainId) {
        setLoading({ isLoading: true, status: 'Swithing network' });
        await switctChain.switchChainAsync({ chainId: chain.id });
      }

      setLoading({
        isLoading: true,
        status: 'Waiting approval',
      });

      const tx = await writeContract.writeContractAsync({
        abi,
        address: chain.contracts.mainContract as `0x${string}`,
        functionName: isOpenBounty ? 'createOpenBounty' : 'createSoloBounty',
        value: BigInt(parseEther(formData.amount)),
        args: [formData.name, formData.description],
        chainId: chain.id,
      });
      setPollingChainId(chain.id);

      setLoading({
        isLoading: true,
        status: 'Waiting for receipt',
      });
      const receipt = await chain.provider.waitForTransactionReceipt({
        hash: tx,
      });

      const log = receipt.logs[0];
      if (!log) {
        throw new Error('No logs found');
      }

      const data = decodeEventLog({
        abi,
        data: log.data,
        topics: log.topics,
      });

      if (data.eventName !== 'BountyCreated') {
        throw new Error('Invalid event: ' + data.eventName);
      }

      for (let i = 0; i < 60; i++) {
        setLoading({ isLoading: true, status: `Indexing ${i}s...` });
        const bounty = await trpcClient.isBountyCreated.query({
          id: Number(data.args.id),
          chainId: pollingChainId ?? chain.id,
        });

        if (bounty) {
          if (formData.category.trim()) {
            await saveBountyCategory.mutateAsync({
              bountyId: Number(data.args.id),
              chainId: pollingChainId ?? chain.id,
              category: formData.category.trim(),
            });
          }
          return data.args.id.toString();
        }
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }

      throw new Error('Failed to index bounty');
    },
    onSuccess: (bountyId) => {
      setLoading({ isLoading: true, status: 'Indexing…' });
      router.push(`/${chain.slug}/bounty/${bountyId}?indexing=true`);
      toast.success('Bounty created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create bounty: ' + error.message);
    },
    onSettled: () => {
      setLoading({ isLoading: false, status: '' });
    },
  });

  const saveBountyCategory = trpc.saveBountyCategory.useMutation();
  const generateBounty = trpc.generateBounty.useMutation({
    onMutate: async () => {
      setName('Generating…');
      setDescription('Generating…');
    },
    onSuccess: (bounty) => {
      setName(bounty.title);
      setDescription(bounty.description);
      toast.success('Bounty generated successfully');
    },
    onError: (error) => {
      setName('');
      setDescription('');
      toast.error('Failed to generate bounty: ' + error.message);
    },
  });

  return (
    <Dialog
      open={open}
      onClose={() => {
        onClose();
        setName('');
        setDescription('');
        setAmount('');
        setCategory('');
        setUsdPerToken(null);
      }}
      maxWidth='xs'
      fullWidth
      PaperProps={{
        className: 'bg-poidhBlue/90',
        style: {
          borderRadius: '30px',
          color: 'white',
          border: '1px solid #D1ECFF',
        },
      }}
    >
      <DialogContent>
        <Box display='flex' flexDirection='column' width='100%'>
          <span className={cn(generateBounty.isPending && 'animate-pulse')}>
            title
          </span>
          <input
            disabled={generateBounty.isPending}
            type='text'
            value={name}
            onChange={(e) => setName(e.target.value)}
            className='border py-2 px-2 rounded-md mb-4 bg-transparent border-[#D1ECFF] disabled:cursor-not-allowed disabled:animate-pulse'
          />
          <span className={cn(generateBounty.isPending && 'animate-pulse')}>
            description
          </span>
          <textarea
            disabled={generateBounty.isPending}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className='border py-2 px-2 rounded-md mb-4 max-h-80 bg-transparent border-[#D1ECFF] disabled:cursor-not-allowed disabled:animate-pulse placeholder:text-slate-400'
            placeholder='pro tip: be detailed and add a deadline'
          ></textarea>

          <span>reward</span>
          <div className='relative w-full mb-3'>
            <input
              type='number'
              step='any'
              placeholder={`amount in ${chain.currency}`}
              value={amount}
              maxLength={16}
              onChange={(e) => {
                const raw = e.target.value;
                const integerPart = raw.split(/[.,]/)[0];
                if (integerPart.length > 20) return;

                setAmount(raw);
                const value = Number(raw);
                if (!isNaN(value) && value > 0) {
                  setUsdPerToken(parseFloat((value * price).toFixed(2)));
                } else {
                  setUsdPerToken(null);
                }
              }}
              className='border bg-transparent border-[#D1ECFF] py-2 px-2 rounded-md placeholder:text-slate-400 w-full pr-28 overflow-hidden whitespace-nowrap text-ellipsis'
            />
            {usdPerToken !== null && (
              <span className='absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 font-semibold pointer-events-none max-w-[120px] truncate text-right'>
                (${formatUsdShort(usdPerToken)})
              </span>
            )}
          </div>
          <div className='flex text-balance gap-2 text-xs mb-4 items-center'>
            <InfoIcon width={18} height={18} /> a 2.5% fee is deducted from
            completed bounties
          </div>

          <span className={cn(generateBounty.isPending && 'animate-pulse')}>
            category
          </span>
          <div className='relative mb-4'>
            <input
              disabled={generateBounty.isPending}
              type='text'
              value={category}
              onChange={(e) => {
                if (!showCategoryDropdown) {
                  setShowCategoryDropdown(true);
                }
                const next = e.target.value.match(/^[^\s]*/)?.[0] ?? '';
                setCategory(next);
              }}
              onFocus={() => setShowCategoryDropdown(true)}
              onBlur={() => setShowCategoryDropdown(false)}
              className='border py-2 px-2 rounded-md bg-transparent border-[#D1ECFF] disabled:cursor-not-allowed disabled:animate-pulse placeholder:text-slate-400 w-full'
              placeholder='optional'
              maxLength={30}
              onKeyDown={(e) => {
                if (/\s/.test(e.key)) {
                  e.preventDefault();
                }
              }}
            />
            {showCategoryDropdown &&
              category &&
              categories &&
              categories.length > 0 && (
                <ul className='absolute left-0 top-full mt-1 w-full z-20 bg-poidhBlue/95 border border-[#D1ECFF] rounded-md max-h-20 overflow-y-auto'>
                  {categories.map((c) => (
                    <li
                      key={c.category}
                      className='px-3 py-1 hover:bg-[#D1ECFF]/20 cursor-pointer whitespace-nowrap'
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setCategory(c.category);
                        setShowCategoryDropdown(false);
                      }}
                    >
                      {c.category.length > 20
                        ? `${c.category.slice(0, 20)}…`
                        : c.category}{' '}
                      ({c._count.category})
                    </li>
                  ))}
                </ul>
              )}
          </div>
          <div className='flex items-center justify-start gap-2'>
            <span>{isOpenBounty ? 'Open Bounty' : 'Solo Bounty'}</span>
            <Switch
              checked={isOpenBounty}
              onClick={() => setIsOpenBounty(!isOpenBounty)}
              inputProps={{ 'aria-label': 'controlled' }}
              sx={{
                '& .MuiSwitch-thumb': {
                  color: isOpenBounty ? '#F15E5F' : 'default',
                },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                  backgroundColor: '#fff',
                },
              }}
            />
          </div>
          <div className=' text-xs'>
            <span className='flex gap-2 items-center max-w-md '>
              <InfoIcon width={18} height={18} />
              {isOpenBounty
                ? 'users can add additional funds to your bounty'
                : 'you are the sole bounty contributor'}
            </span>
          </div>
          <div className='mt-6 flex flex-col items-center w-full'>
            <button
              className={cn(
                'flex flex-row items-center justify-center',
                account.isDisconnected && 'opacity-50 cursor-not-allowed'
              )}
              onClick={() => {
                if (name && description && amount) {
                  const formData = {
                    name,
                    description,
                    amount,
                    category,
                  };

                  onClose();
                  setUsdPerToken(null);
                  setName('');
                  setDescription('');
                  setAmount('');
                  setCategory('');
                  createBountyMutations.mutate(formData);
                } else {
                  toast.error(
                    'Please fill in all required fields and check wallet connection.'
                  );
                }
              }}
              disabled={account.isDisconnected}
            >
              <div className='button'>
                <GameButton />
              </div>
              <ButtonCTA>create bounty</ButtonCTA>
            </button>
            <div className='mt-5 w-full flex justify-center items-center flex-row'>
              <span className='mr-2 whitespace-nowrap'>
                need a bounty idea? click the
              </span>
              <button
                className='cursor-pointer items-center text-center disabled:cursor-not-allowed'
                onClick={() => generateBounty.mutate()}
                disabled={generateBounty.isPending}
              >
                🤖
              </button>
            </div>
          </div>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
