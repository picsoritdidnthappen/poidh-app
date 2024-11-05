import Link from 'next/link';
import React, { useEffect } from 'react';
import { toast } from 'react-toastify';
import { formatEther } from 'viem';

import { useGetChain } from '@/hooks/useGetChain';
import BountyMultiplayer from '@/components/bounty/BountyMultiplayer';
import { trpc } from '@/trpc/client';
import { useAccount, useSwitchChain, useWriteContract } from 'wagmi';
import abi from '@/constant/abi/abi';
import { useMutation } from '@tanstack/react-query';
import DisplayAddress from '@/components/DisplayAddress';

export default function BountyInfo({ bountyId }: { bountyId: string }) {
  const chain = useGetChain();
  const account = useAccount();
  const writeContract = useWriteContract({});
  const switctChain = useSwitchChain();

  const bounty = trpc.bounty.useQuery(
    {
      id: bountyId,
      chainId: chain.id.toString(),
    },
    { enabled: !!bountyId }
  );

  const cancelMutation = useMutation({
    mutationFn: async (bountyId: bigint) => {
      if (chain.id !== account.chainId) {
        await switctChain.switchChainAsync({ chainId: chain.id });
      }
      await writeContract.writeContractAsync({
        __mode: 'prepared',
        abi,
        address: chain.contracts.mainContract as `0x${string}`,
        functionName: bounty.data!.isMultiplayer
          ? 'cancelOpenBounty'
          : 'cancelSoloBounty',
        args: [bountyId],
        chainId: chain.id,
      });
    },
  });

  useEffect(() => {
    if (cancelMutation.isSuccess) {
      toast.success('Bounty canceled successfully');
    }
    if (cancelMutation.isError) {
      toast.error('Failed to cancel bounty');
    }
  }, [cancelMutation.isSuccess, cancelMutation.isError]);

  if (!bounty.data) {
    return null;
  }

  return (
    <>
      <div className='flex pt-20 flex-col justify-between lg:flex-row'>
        <div className='flex flex-col  lg:w-[50%]'>
          <p className='max-w-[30ch] overflow-hidden text-ellipsis text-2xl lg:text-4xl text-bold normal-case'>
            {bounty.data.title}
          </p>
          <p className='mt-5 normal-case'>{bounty.data.description}</p>
          <p className='mt-5 normal-case break-all'>
            bounty issuer:{' '}
            <Link
              href={`/${chain.slug}/account/${bounty.data.issuer}`}
              className='hover:text-gray-200'
            >
              <DisplayAddress address={bounty.data.issuer} chain={chain} />
            </Link>
          </p>
        </div>
        <div className='flex flex-col space-between'>
          <div className='flex mt-5 lg:mt-0 gap-x-2 flex-row'>
            <span>{formatEther(BigInt(bounty.data.amount))}</span>
            <span>{chain.currency}</span>
          </div>
          <div>
            {bounty.data.inProgress &&
              account.isConnected &&
              account.address === bounty.data.issuer && (
                <button
                  onClick={() => {
                    if (account.isConnected) {
                      cancelMutation.mutate(BigInt(bountyId));
                    } else {
                      toast.error('Please connect wallet to continue');
                    }
                  }}
                  disabled={!bounty.data.inProgress}
                  className={`border border-[#F15E5F] rounded-md py-2 px-5 mt-5 ${
                    !bounty.data.inProgress
                      ? 'bg-[#F15E5F] text-white'
                      : 'hover:bg-red-400 hover:text-white'
                  } `}
                >
                  {bounty.data.isCanceled
                    ? 'canceled'
                    : account.address === bounty.data.issuer
                    ? 'cancel'
                    : !bounty.data.inProgress
                    ? 'accepted'
                    : null}
                </button>
              )}
          </div>
        </div>
      </div>
      {bounty.data.isMultiplayer && (
        <BountyMultiplayer
          chain={chain}
          bountyId={bountyId}
          inProgress={Boolean(bounty.data.inProgress)}
          issuer={bounty.data.issuer}
        />
      )}
    </>
  );
}
