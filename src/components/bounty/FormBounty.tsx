import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  Switch,
} from '@mui/material';
import { useState } from 'react';
import { toast } from 'react-toastify';

import { useGetChain } from '@/hooks/useGetChain';
import { useAccount, useSwitchChain, useWriteContract } from 'wagmi';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { decodeEventLog, parseEther } from 'viem';
import abi from '@/constant/abi/abi';
import { cn } from '@/utils';
import Loading from '@/components/global/Loading';
import GameButton from '@/components/global/GameButton';
import { InfoIcon } from '@/components/global/Icons';
import ButtonCTA from '../global/ButtonCTA';

type Bounty = {
  title: string;
  description: string;
};

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
  const [isSoloBounty, setIsSoloBounty] = useState(true);
  const [status, setStatus] = useState<string>('');
  const chain = useGetChain();
  const writeContract = useWriteContract({});
  const account = useAccount();
  const switctChain = useSwitchChain();
  const router = useRouter();

  const createBountyMutations = useMutation({
    mutationFn: async () => {
      const chainId = await account.connector?.getChainId();
      if (chain.id !== chainId) {
        setStatus('Switching chain');
        await switctChain.switchChainAsync({ chainId: chain.id });
      }

      setStatus('Waiting approval');
      const tx = await writeContract.writeContractAsync({
        abi,
        address: chain.contracts.mainContract as `0x${string}`,
        functionName: isSoloBounty ? 'createSoloBounty' : 'createOpenBounty',
        value: BigInt(parseEther(amount)),
        args: [name, description],
        chainId: chain.id,
      });

      setStatus('Waiting for receipt');
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

      return data.args.id.toString();
    },
    onSuccess: (bountyId) => {
      router.push(`/${chain.slug}/bounty/${bountyId}?indexing=true`);
      toast.success('Bounty created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create bounty: ' + error.message);
    },
    onSettled: () => {
      setStatus('');
    },
  });

  const generateBountyMutation = useMutation({
    mutationFn: async () => {
      setName('Generating…');
      setDescription('Generating…');
      const res = await fetch('/api/generateBounty', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return JSON.parse(await res.json()) as Bounty;
    },
    onSuccess: (bounty: Bounty) => {
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
    <>
      <Loading open={createBountyMutations.isPending} status={status} />
      <Dialog
        open={open}
        onClose={() => {
          onClose();
          setAmount('');
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
            <span
              className={cn(
                generateBountyMutation.isPending && 'animate-pulse'
              )}
            >
              title
            </span>
            <input
              disabled={generateBountyMutation.isPending}
              type='text'
              value={name}
              onChange={(e) => setName(e.target.value)}
              className='border py-2 px-2 rounded-md mb-4 bg-transparent border-[#D1ECFF] disabled:cursor-not-allowed disabled:animate-pulse'
            />
            <span
              className={cn(
                generateBountyMutation.isPending && 'animate-pulse'
              )}
            >
              description
            </span>
            <textarea
              disabled={generateBountyMutation.isPending}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className='border py-2 px-2 rounded-md mb-4 max-h-28 bg-transparent border-[#D1ECFF] disabled:cursor-not-allowed disabled:animate-pulse'
            ></textarea>

            <span>reward</span>
            <input
              type='number'
              placeholder={`amount in ${chain.currency}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className='border bg-transparent border-[#D1ECFF] py-2 px-2 rounded-md mb-4 placeholder:text-slate-400'
            />
            <div className='flex text-balance gap-2 text-xs mb-2 items-center'>
              <InfoIcon width={18} height={18} /> a 2.5% fee is deducted from
              completed bounties
            </div>
            <div className='flex items-center justify-start gap-2'>
              <span>{isSoloBounty ? 'Solo Bounty' : 'Open Bounty'}</span>
              <Switch
                checked={isSoloBounty}
                onClick={() => setIsSoloBounty(!isSoloBounty)}
                inputProps={{ 'aria-label': 'controlled' }}
                sx={{
                  '& .MuiSwitch-thumb': {
                    color: isSoloBounty ? '#F15E5F' : 'default',
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
                {isSoloBounty
                  ? 'you are the sole bounty contributor'
                  : 'users can add additional funds to your bounty'}
              </span>
            </div>
          </Box>
        </DialogContent>
        <DialogActions>
          <button
            className={cn(
              'flex flex-row items-center justify-center',
              account.isDisconnected && 'opacity-50 cursor-not-allowed'
            )}
            onClick={() => {
              if (name && description && amount) {
                onClose();
                createBountyMutations.mutate();
              } else {
                toast.error(
                  'Please fill in all fields and check wallet connection.'
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
        </DialogActions>
        <div className='py-4 mt-1 w-full flex justify-center items-center flex-row'>
          <span className='mr-2'>need a bounty idea? click the</span>
          <button
            className='cursor-pointer items-center text-center disabled:cursor-not-allowed'
            onClick={() => generateBountyMutation.mutate()}
            disabled={generateBountyMutation.isPending}
          >
            🤖
          </button>
        </div>
      </Dialog>
    </>
  );
}
