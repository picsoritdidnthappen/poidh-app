import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import Link from 'next/link';
import React from 'react';
import { toast } from 'react-toastify';

import { weiToEth, applyBreakAllToLongWords } from '@/lib';

import { useGetChain } from '@/hooks';
import { BountyMultiplayer, useBountyContext } from '@/components/bounty';
import { CreateClaim } from '@/components/ui';
import { cancelOpenBounty, cancelSoloBounty } from '@/app/context';
import { BlacklistedBounties } from '@/constant';
import { ErrorInfo } from '@/types';

const BountyInfo = ({ bountyId }: { bountyId: string }) => {
  const { primaryWallet } = useDynamicContext();
  const userChain = useGetChain();

  const getBlacklistedBounties = (chain: string | undefined): number[] => {
    if (!chain || !BlacklistedBounties[chain]) return [];
    return BlacklistedBounties[chain] as number[];
  };

  const isBountyBlacklisted = (id: string): boolean => {
    const blacklistedBountiesForChain = getBlacklistedBounties(userChain);
    return blacklistedBountiesForChain.includes(Number(id));
  };

  const { isMultiplayer, isOwner, bountyData, isBountyClaimed } =
    useBountyContext() || {};

  if (isBountyBlacklisted(bountyId)) {
    return null;
  }

  const handleCancelBounty = async () => {
    if (!primaryWallet) {
      toast.error('Please connect your wallet first.');
      return;
    }
    try {
      await cancelSoloBounty(primaryWallet, bountyId);
      toast.success('Bounty canceled successfully!');
    } catch (error) {

      console.error('Error canceling bounty:', error);
      const errorCode = (error as unknown as ErrorInfo)?.info?.error?.code;
      if (errorCode === 4001) {
        toast.error('Transaction denied by user.');
      } else {
        toast.error('Failed to cancel bounty.');
      }
    }
  };

  const handleCancelOpenBounty = async () => {
    if (!primaryWallet) {
      toast.error('Please connect wallet');
      return;
    }
    try {
      await cancelOpenBounty(primaryWallet, bountyId);
      toast.success('Bounty canceled successfully!');
    } catch (error) {

      console.error('Error canceling:', error);
      const errorCode = (error as unknown as ErrorInfo)?.info?.error?.code;
      if (errorCode === 4001) {
        toast.error('Transaction denied by user.');
      } else {
        toast.error('Failed to cancel.');
      }
    }
  };

  const handleCancel = () => {
    if (!isMultiplayer) {
      handleCancelBounty();
    } else {
      handleCancelOpenBounty();
    }
  };

  return (
    <>
      <div className='flex pt-20 flex-col  justify-between lg:flex-row'>
        <div className='flex flex-col  lg:max-w-[50%]'>
          <p className=' text-2xl lg:text-4xl text-bold normal-case'>
            {bountyData?.name}
          </p>
          <p className='mt-5 normal-case'>
            {applyBreakAllToLongWords(bountyData?.description)}
          </p>
          <p className='mt-5 normal-case break-all'>
            bounty issuer:{' '}
            <Link
              href={`/${userChain}/account/${bountyData?.issuer}`}
              className='hover:text-gray-200'
            >
              {' '}
              {bountyData?.issuerDegenOrEnsName || bountyData?.issuer}
            </Link>
          </p>
        </div>

        <div className='flex flex-col space-between'>
          <div className='flex mt-5 lg:mt-0 gap-x-2 flex-row'>
            <span>
              {bountyData ? weiToEth(bountyData.amount) : 'Loading...'}
            </span>
            <span>
              {userChain === ('base' || 'arbitrum') ? 'eth' : 'degen'}
            </span>
          </div>

          <div>
            {!isBountyClaimed && !isOwner ? (
              <CreateClaim bountyId={bountyId} />
            ) : (
              <button
                onClick={handleCancel}
                disabled={!!isBountyClaimed}
                className={`border border-[#F15E5F]  rounded-md py-2 px-5 mt-5 ${
                  isBountyClaimed
                    ? 'bg-[#F15E5F] text-white '
                    : 'text-[#F15E5F]'
                } `}
              >
                {bountyData?.claimer === bountyData?.issuer
                  ? 'canceled'
                  : bountyData?.claimer !== bountyData?.issuer &&
                    bountyData?.claimer !==
                      '0x0000000000000000000000000000000000000000'
                  ? 'accepted'
                  : bountyData?.claimer ===
                    '0x0000000000000000000000000000000000000000'
                  ? 'cancel'
                  : null}
              </button>
            )}
          </div>
        </div>
      </div>

      {isMultiplayer ? (
        <div>
          <BountyMultiplayer
            bountyId={bountyId}
            currentNetworkName={userChain}
          />
        </div>
      ) : null}
    </>
  );
};

export default BountyInfo;
