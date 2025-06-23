import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import { useGetChain } from '@/hooks/useGetChain';
import BountyMultiplayer from '@/components/bounty/BountyMultiplayer';
import { trpc, trpcClient } from '@/trpc/client';
import {
  useAccount,
  useSignMessage,
  useSwitchChain,
  useWriteContract,
} from 'wagmi';
import { useMutation } from '@tanstack/react-query';
import { formatEther } from 'viem';
import abi from '@/constant/abi/abi';
import { cn } from '@/utils';
import {
  fetchPrice,
  formatAmount,
  getBanSignatureFirstLine,
} from '@/utils/utils';
import DisplayAddress from '@/components/global/DisplayAddress';
import CopyAddressButton from '@/components/global/CopyAddressButton';
import BountyHistory from './BountyHistory';
import Withdraw from './Withdraw';
import JoinBounty from './JoinBounty';
import { useSetAtom } from 'jotai';
import { setLoadingAtom } from '@/store/loading';
import TextWithLinks from '@/components/global/TextWithLinks';
import FarcasterIcon from '@/components/global/FarcasterIcon';
import XLink from '@/components/global/TwitterXLink';
import { ShareIcon } from '@/components/global/Icons';

export default function BountyInfo({ bountyId }: { bountyId: string }) {
  const chain = useGetChain();
  const account = useAccount();
  const writeContract = useWriteContract({});
  const switctChain = useSwitchChain();
  const isAdmin = trpc.isAdmin.useQuery({ address: account.address });
  const banBountyMutation = trpc.banBounty.useMutation({});
  const { signMessageAsync } = useSignMessage();
  const setLoading = useSetAtom(setLoadingAtom);

  const [price, setPrice] = useState<number>(0);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      toast.success('bounty link copied to clipboard');
    });
  };

  const bounty = trpc.bounty.useQuery(
    {
      id: Number(bountyId),
      chainId: chain.id,
    },
    { enabled: !!bountyId }
  );

  const participants = trpc.participations.useQuery(
    {
      bountyId: Number(bountyId),
      chainId: chain.id,
    },
    {
      enabled: !!bountyId,
    }
  );

  const signMutation = useMutation({
    mutationFn: async (bountyId: string) => {
      //arbitrum has a problem with message signing, so all confirmations are on base
      const chainId = await account.connector?.getChainId();
      if (chainId !== 8453) {
        await switctChain.switchChainAsync({ chainId: 8453 });
      }

      const message =
        getBanSignatureFirstLine({
          id: Number(bountyId),
          chainId: chain.id,
          type: 'bounty',
        }) + JSON.stringify(bounty.data, undefined, 2);
      if (account.address) {
        const signature = await signMessageAsync({ message }).catch(() => null);
        if (!signature) {
          throw new Error('Failed to sign message');
        }
        await banBountyMutation.mutateAsync({
          id: Number(bountyId),
          chainId: chain.id,
          address: account.address,
          chainName: chain.slug,
          message,
          signature,
        });
      }
    },
    onSuccess: () => {
      toast.success('Bounty banned');
    },
    onError: (error) => {
      toast.error('Failed to ban bounty: ' + error.message);
    },
    onSettled: () => {
      bounty.refetch();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (bountyId: bigint) => {
      const chainId = await account.connector?.getChainId();
      if (chain.id !== chainId) {
        setLoading({ isLoading: true, status: 'Switching network...' });
        await switctChain.switchChainAsync({ chainId: chain.id });
      }

      if (!bounty.data) {
        throw new Error('Bounty data not found');
      }

      setLoading({ isLoading: true, status: 'Waiting approval' });
      await writeContract.writeContractAsync({
        abi,
        address: chain.contracts.mainContract as `0x${string}`,
        functionName: bounty.data.isMultiplayer
          ? 'cancelOpenBounty'
          : 'cancelSoloBounty',
        args: [bountyId],
        chainId: chain.id,
      });

      for (let i = 0; i < 60; i++) {
        setLoading({ isLoading: true, status: `Indexing ${i}s...` });
        const canceled = await trpcClient.isBountyCanceled.query({
          id: Number(bountyId),
          chainId: chain.id,
        });
        if (canceled) {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }
      throw new Error('Failed to cancel bounty');
    },
    onSuccess: () => {
      setLoading({ isLoading: false });
      toast.success('Bounty canceled');
    },
    onError: (error) => {
      setLoading({ isLoading: false });
      toast.error('Failed to cancel bounty: ' + error.message);
    },
    onSettled: () => {
      bounty.refetch();
    },
  });

  const isCurrentUserAParticipant = participants.data?.some(
    (participant) =>
      participant.user_address.toLocaleLowerCase() ===
      account.address?.toLocaleLowerCase()
  );

  useEffect(() => {
    fetchPrice({ currency: chain.currency }).then(setPrice);
  }, [chain.currency]);

  const canWithdraw =
    account.address?.toLocaleLowerCase() !==
      bounty.data?.issuer.toLocaleLowerCase() &&
    !bounty.data?.is_voting &&
    isCurrentUserAParticipant;

  if (!bounty.data) {
    return null;
  }

  return (
    <>
      <div className='flex pt-8 flex-col justify-between lg:flex-row'>
        <div className='flex flex-col  lg:w-[50%]'>
          <p className='max-w-[30ch] overflow-hidden text-ellipsis text-2xl lg:text-4xl text-bold normal-case break-words'>
            {bounty.data.title}
          </p>
          <p className='mt-5 normal-case break-words'>
            <TextWithLinks>{bounty.data.description}</TextWithLinks>
          </p>
          <div className='flex flex-row mt-5 normal-case break-all flex-wrap'>
            bounty issuer:&nbsp;
            <div className='flex flex-row  items-center justify-end overflow-hidden'>
              <DisplayAddress chain={chain} address={bounty.data.issuer} />
              <div className='ml-2 mr-2'>
                <CopyAddressButton address={bounty.data.issuer} />
              </div>
              <div className='flex items-center gap-2'>
                <FarcasterIcon address={bounty.data.issuer} />
                <XLink address={bounty.data.issuer} />
              </div>
            </div>
          </div>
          {isAdmin.data && (
            <button
              onClick={() => {
                if (isAdmin.data) {
                  signMutation.mutate(bountyId);
                } else {
                  toast.error('You are not an admin');
                }
              }}
              disabled={bounty.data.ban.length > 0 || false}
              className={cn(
                'border border-poidhRed w-fit rounded-md py-2 px-5 mt-5',
                bounty.data.ban.length > 0
                  ? 'bg-red-400 text-white'
                  : 'hover:bg-red-400 hover:text-white'
              )}
            >
              {bounty.data.ban.length > 0 ? 'banned' : 'ban'}
            </button>
          )}
          <p className='mt-5 font-bold'>
            {formatAmount({
              amount: formatEther(BigInt(bounty.data.amount)),
              currency: chain.currency,
              price: price.toString(),
            })}
          </p>
        </div>
        <div className='flex flex-col space-between'>
          {bounty.data.inProgress ? (
            account.address?.toLocaleLowerCase() ===
              bounty.data.issuer.toLocaleLowerCase() &&
            !bounty.data.is_voting && (
              <button
                onClick={() => cancelMutation.mutate(BigInt(bountyId))}
                disabled={!bounty.data.inProgress}
                className='border border-poidhRed rounded-md w-fit py-2 px-5 mt-5 hover:bg-red-400 hover:text-white'
              >
                cancel
              </button>
            )
          ) : (
            <span className='border border-poidhRed w-fit rounded-md py-2 px-5 mt-5 bg-poidhRed text-white'>
              {bounty.data.isCanceled ? 'canceled' : 'accepted'}
            </span>
          )}
        </div>
      </div>
      <button
        type='button'
        onClick={handleShare}
        className='flex items-center gap-1 mt-3 underline hover:no-underline w-fit'
      >
        share bounty <ShareIcon width={16} height={16} />
      </button>
      {bounty.data.isMultiplayer && (
        <BountyMultiplayer chain={chain} bountyId={bountyId} />
      )}
      <BountyHistory
        transactions={bounty.data.transactions.map((transaction) => {
          return { ...transaction, timestamp: Number(transaction.timestamp) };
        })}
      />
      {bounty.data.is_multiplayer &&
        bounty.data.inProgress &&
        (canWithdraw ? (
          <Withdraw bountyId={bountyId} />
        ) : (
          !bounty.data.is_voting && <JoinBounty bountyId={bountyId} />
        ))}
    </>
  );
}
