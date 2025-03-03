import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { parseEther } from 'viem';
import {
  useAccount,
  useChainId,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
} from 'wagmi';
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
import { Netname } from '@/utils/types';
import { chains } from '@/utils/config';

export default function JoinBounty({
  bountyId,
  open,
  onClose,
  chainId,
}: {
  bountyId: string;
  open: boolean;
  onClose: () => void;
  chainId: Netname;
}) {
  const [amount, setAmount] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const utils = trpc.useUtils();
  const account = useAccount();
  const currentChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const CurrChain = chains[chainId];
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const doTransaction = async (bountyId: bigint) => {
    try {
      // Check if we need to switch chains
      if (currentChainId !== CurrChain.id) {
        setStatus('Switching network');
        try {
          await switchChainAsync({ chainId: CurrChain.id });
        } catch (error) {
          console.error('Failed to switch chain:', error);
          toast.error('Failed to switch network. Please switch manually.');
          setStatus('');
          return;
        }
      }

      setStatus('Sending transaction');
      const hash = await writeContractAsync({
        abi,
        address: CurrChain.contracts.mainContract as `0x${string}`,
        value: BigInt(parseEther(amount)),
        functionName: 'joinOpenBounty',
        args: [bountyId],
        chainId: CurrChain.id,
      });

      setStatus('Waiting for confirmation');
      const transaction = await publicClient?.waitForTransactionReceipt({
        hash,
      });

      if (!transaction) throw new Error('Transaction failed');

      // Pass both the bountyId and transaction hash for tracking
      await bountyMutation.mutate({
        bountyId,
        hash: transaction.transactionHash,
      });
    } catch (error) {
      console.error(error);
      toast.error('Failed to join bounty: ' + (error as Error).message);
      setStatus('');
      throw error;
    }
  };

  const bountyMutation = useMutation({
    mutationFn: async ({
      bountyId,
      hash,
    }: {
      bountyId: bigint;
      hash: string;
    }) => {
      for (let i = 0; i < 60; i++) {
        setStatus(`Indexing ${i}s`);
        const participant = await trpcClient.isJoinedBounty.query({
          bountyId: Number(bountyId),
          chainId: CurrChain.id,
          participantAddress: account.address!,
        });

        if (participant) {
          setStatus('');
          return participant;
        }
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }
      throw new Error('indexing_timeout');
    },
    onSuccess: () => {
      toast.success('Bounty joined successfully');
      onClose();
      utils.participations.refetch();
      setAmount('');
      setStatus('');
    },
    onError: (error) => {
      if (error.message === 'indexing_timeout') {
        toast.warning(
          'Transaction was submitted but indexing timed out. Please check your status in a few minutes.'
        );
      } else {
        toast.error('Failed to join bounty: ' + error.message);
      }
      setStatus('');
    },
    onSettled: () => {
      utils.participations.refetch();
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
              placeholder={`enter amount in ${CurrChain.currency}`}
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
