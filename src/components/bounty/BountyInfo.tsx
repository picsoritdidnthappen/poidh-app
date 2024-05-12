import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { toast } from 'react-toastify';

import BountyMultiplayer from '@/components/bounty/BountyMultiplayer';
import { useBountyContext } from '@/components/bounty/BountyProvider';
import CreateProof from '@/components/ui/CreateProof';

import { cancelOpenBounty, cancelSoloBounty } from '@/app/context/web3';
import { blacklistedBounties } from '@/constant/blacklist';

function weiToEther(weiValue: string | number | bigint): string {
  const etherValue = Number(weiValue) / 1e18;
  return etherValue.toFixed(6);
}

const BountyInfo = ({ bountyId }: { bountyId: string }) => {
  const { primaryWallet } = useDynamicContext();

  const {
    isMultiplayer,
    isOwner,
    bountyData,
    isBountyClaimed,
    isBountyCanceled,
    isOwnerContributor,
  } = useBountyContext()!;

  if (blacklistedBounties.includes(Number(bountyId))) {
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
      const errorCode = (error as any)?.info?.error?.code;
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
      const errorCode = (error as any)?.info?.error?.code;
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
        <div className='flex flex-col  lg:max-w-[50%] break-all'>
          <p className=' text-2xl lg:text-4xl text-bold'>{bountyData?.name}</p>
          <p className='mt-5'>{bountyData?.description}</p>
          <p className='mt-5'>
            Bounty issuer:{' '}
            {bountyData?.issuerDegenOrEnsName || bountyData?.issuer}
          </p>
        </div>

        <div className='flex flex-col space-between'>
          <div className='flex mt-5 lg:mt-0 gap-x-2 flex-row'>
            <span>
              {bountyData ? weiToEther(bountyData.amount) : 'Loading...'}
            </span>
            <span>degen</span>
          </div>

          <div>
            {!isBountyClaimed && !isOwner ? (
              <CreateProof bountyId={bountyId} />
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
          <BountyMultiplayer bountyId={bountyId} />
        </div>
      ) : null}
    </>
  );
};

export default BountyInfo;
