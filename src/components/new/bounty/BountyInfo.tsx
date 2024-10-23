/* eslint-disable simple-import-sort/imports */
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import Link from 'next/link';
import React from 'react';
import { toast } from 'react-toastify';
import { formatEther } from 'viem';

import { useGetChain } from '@/hooks/new/useGetChain';
import BountyMultiplayer from '@/components/new/bounty/BountyMultiplayer';
import CreateClaim from '@/components/new/ui/CreateClaim';
import { trpc } from '@/trpc/client';
import { cancelOpenBounty, cancelSoloBounty } from '@/app/context';

export default function BountyInfo({ bountyId }: { bountyId: string }) {
  const { primaryWallet } = useDynamicContext();
  const chain = useGetChain();

  const { data: bounty } = trpc.bounty.useQuery({
    id: bountyId.toString(),
    chainId: chain.id.toString(),
  });

  if (!bounty) {
    return null;
  }

  const handleCancel = async () => {
    if (!primaryWallet) {
      toast.error('Please connect your wallet first.');
      return;
    }
    try {
      bounty.isMultiplayer
        ? await cancelOpenBounty(primaryWallet, bountyId)
        : await cancelSoloBounty(primaryWallet, bountyId);
      toast.success('Bounty canceled successfully!');
    } catch (error: any) {
      if (error?.info?.error?.code !== 4001) {
        toast.error('Failed to cancel bounty.');
      }
    }
  };

  return (
    <>
      <div className='flex pt-20 flex-col  justify-between lg:flex-row'>
        <div className='flex flex-col  lg:max-w-[50%]'>
          <p className='max-w-[30ch] overflow-hidden text-ellipsis text-2xl lg:text-4xl text-bold normal-case'>
            {bounty.title}
          </p>
          <p className='max-w-[30ch] overflow-hidden text-ellipsis mt-5 normal-case'>
            {bounty.description}
          </p>
          <p className='mt-5 normal-case break-all'>
            bounty issuer:{' '}
            <Link
              href={`/new/${chain.chainPathName}/account/${bounty.issuer}`}
              className='hover:text-gray-200'
            >
              {bounty.issuer}
            </Link>
          </p>
        </div>

        <div className='flex flex-col space-between'>
          <div className='flex mt-5 lg:mt-0 gap-x-2 flex-row'>
            <span>{formatEther(BigInt(bounty.amount))}</span>
            <span>{chain.currency}</span>
          </div>

          <div>
            {bounty.inProgress && primaryWallet?.address !== bounty.issuer ? (
              <CreateClaim bountyId={bountyId} />
            ) : (
              <button
                onClick={handleCancel}
                disabled={!bounty.inProgress}
                className={`border border-[#F15E5F]  rounded-md py-2 px-5 mt-5 ${
                  !bounty.inProgress
                    ? 'bg-[#F15E5F] text-white '
                    : 'text-[#F15E5F]'
                } `}
              >
                {bounty.isCanceled
                  ? 'canceled'
                  : primaryWallet?.address === bounty.issuer
                  ? 'cancel'
                  : !bounty.inProgress
                  ? 'accepted'
                  : null}
              </button>
            )}
          </div>
        </div>
      </div>
      {bounty.isMultiplayer && (
        <BountyMultiplayer
          chain={chain}
          bountyId={bountyId}
          inProgress={Boolean(bounty.inProgress)}
          issuer={bounty.issuer}
          isCanceled={Boolean(bounty.isCanceled)}
        />
      )}
    </>
  );
}
