import abi from '@/constant/abi/abi';
import { useGetChain } from '@/hooks/useGetChain';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { parseEther } from 'viem';
import { useAccount, useSwitchChain, useWriteContract } from 'wagmi';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Typography,
} from '@mui/material';
import { cn } from '@/utils';
import Loading from '@/components/global/Loading';
import { trpc, trpcClient } from '@/trpc/client';

export default function FormJoinBounty({
  bountyId,
  open,
  onClose,
}: {
  bountyId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const utils = trpc.useUtils();

  const account = useAccount();
  const writeContract = useWriteContract({});
  const chain = useGetChain();
  const switchChain = useSwitchChain();

  const bountyMutation = useMutation({
    mutationFn: async (bountyId: bigint) => {
      const chainId = await account.connector?.getChainId();
      if (chain.id !== chainId) {
        await switchChain.switchChainAsync({ chainId: chain.id });
      }
      setStatus('Waiting approval');
      await writeContract.writeContractAsync({
        abi,
        address: chain.contracts.mainContract as `0x${string}`,
        value: BigInt(parseEther(amount)),
        functionName: 'joinOpenBounty',
        args: [bountyId],
        chainId: chain.id,
      });

      for (let i = 0; i < 60; i++) {
        setStatus('Indexing ' + i + 's');
        const participant = await trpcClient.isJoinedBounty.query({
          bountyId: Number(bountyId),
          chainId: chain.id,
          participantAddress: account.address!,
        });
        if (participant) {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }

      throw new Error('Failed to join bounty');
    },
    onSuccess: () => {
      toast.success('Bounty joined successfully');
    },
    onError: (error) => {
      toast.error('Failed to join bounty: ' + error.message);
    },
    onSettled: () => {
      utils.participations.refetch();
      setAmount('');
    },
  });

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.replace(/[^0-9.]/g, '');
    setAmount(value);
  };

  return (
    <>
      <Loading open={bountyMutation.isPending} status={status} />
      <Dialog
        open={open}
        onClose={() => {
          onClose();
          setAmount('');
        }}
        maxWidth='xs'
        fullWidth
        PaperProps={{
          className: 'bg-poidhBlue/80',
          style: {
            borderRadius: '10px',
            color: 'white',
            border: '1px solid #D1ECFF',
          },
        }}
      >
        <DialogContent>
          <Box
            display='flex'
            flexDirection='column'
            alignItems='left'
            width='100%'
          >
            <Typography
              variant='subtitle1'
              gutterBottom
              className='font-family-geist'
            >
              Reward
            </Typography>
            <input
              type='number'
              className='border bg-transparent border-[#D1ECFF] py-2 px-2 rounded-md mb-4 w-full placeholder:text-slate-400'
              onChange={handleAmountChange}
              placeholder={`enter amount in ${chain.currency}`}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            className={cn(
              'w-full rounded-full lowercase bg-[#F15E5F] hover:bg-red-400 text-white font-family-geist',
              !amount && 'opacity-50 cursor-not-allowed'
            )}
            disabled={!amount}
            onClick={() => {
              if (account.address) {
                onClose();
                bountyMutation.mutate(BigInt(bountyId));
              } else {
                toast.error('Please connect wallet to continue');
              }
            }}
          >
            join bounty
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
