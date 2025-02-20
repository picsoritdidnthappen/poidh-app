import { useGetChain } from '@/hooks/useGetChain';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { parseEther } from 'viem';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
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
import abi from '@/constant/abi/abi';

export default function JoinBounty({
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
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const utils = trpc.useUtils();
  const account = useAccount();
  const chain = useGetChain();
  // const { sendTransaction } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  // const {wait} = useWaitForTransactionReceipt()

  const doTransaction = async (bountyId: bigint) => {
    try {
      setStatus('Sending transaction');

      const hash = await writeContractAsync({
        abi,
        address: chain.contracts.mainContract as `0x${string}`,
        value: BigInt(parseEther(amount)),
        functionName: 'joinOpenBounty',
        args: [bountyId],
        chainId: chain.id,
      });

      setStatus('Waiting for confirmation');

      const transaction = await publicClient?.waitForTransactionReceipt({
        hash,
      });

      await bountyMutation.mutate(BigInt(bountyId));
    } catch (error) {
      console.error(error);
      toast.error('Failed to join bounty: ' + (error as any).message);
      setStatus('Failed to join bounty');
    }
  };

  const bountyMutation = useMutation({
    mutationFn: async (bountyId: bigint) => {
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
      setTxHash(null);
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
            background: '#12AAFF',
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
              className='border bg-transparent border-[#D1ECFF] py-2 px-2 rounded-md mb-4 w-full placeholder:text-gray-300'
              onChange={handleAmountChange}
              placeholder={`enter amount in ${chain.currency}`}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='outlined'
            className={cn(
              'w-full rounded-full lowercase bg-[#F15E5F] hover:bg-red-400 text-white font-family-geist'
            )}
            disabled={!amount}
            onClick={() => {
              if (account.address) {
                onClose();
                doTransaction(BigInt(bountyId));
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
