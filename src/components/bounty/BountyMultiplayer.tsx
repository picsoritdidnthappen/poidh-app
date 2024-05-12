import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useEffect, useState } from 'react';

import { useBountyContext } from '@/components/bounty/BountyProvider';
import JoinBounty from '@/components/ui/JoinBounty';
import Withdraw from '@/components/ui/Withdraw';

import { getDegenOrEnsName, getParticipants } from '@/app/context/web3';

import { OpenBounty } from '../../types/web3';

function weiToEther(weiValue: string | number): string {
  const etherValue = Number(weiValue) / 1e18;
  return etherValue.toFixed(10);
}

const BountyMultiplayer = ({ bountyId }: { bountyId: string }) => {
  const [participants, setParticipants] = useState<OpenBounty | null>(null);
  const [showParticipants, setShowParticipants] = useState(false);
  // const [userParticipate, setUserParticipate] = useState(false);

  const { user } = useDynamicContext();
  const currentUser = user?.verifiedCredentials[0].address;

  useEffect(() => {
    if (bountyId) {
      getParticipants(bountyId)
        .then(async (data: OpenBounty) => {
          const filteredAddresses = data.addresses.filter(
            (address) =>
              address !== '0x0000000000000000000000000000000000000000'
          );
          const filteredAmounts = data.amounts.filter(
            (_, index) =>
              data.addresses[index] !==
              '0x0000000000000000000000000000000000000000'
          );
          const degenOrEnsNames = await Promise.all(
            filteredAddresses.map((addr) => getDegenOrEnsName(addr))
          );

          setParticipants({
            addresses: filteredAddresses,
            amounts: filteredAmounts,
            degenOrEnsNames,
          });
        })
        .catch(console.error);
    }
  }, [bountyId]);

  const toggleParticipants = () => {
    setShowParticipants(!showParticipants);
  };

  const isCurrentUserAParticipant = currentUser
    ? participants?.addresses.includes(currentUser)
    : false;

  const { isMultiplayer, isOwner, bountyData, isBountyClaimed } =
    useBountyContext()!;

  return (
    <>
      <div>
        <div></div>
        <button
          onClick={toggleParticipants}
          className='border border-white rounded-full mt-5  px-5 py-2 flex justify-between items-center backdrop-blur-sm bg-[#D1ECFF]/20 w-fit'
        >
          {participants
            ? `${participants.addresses.length} contributors`
            : 'Loading contributors...'}
          <span
            className={`${
              showParticipants ? '-rotate-180' : ''
            } animation-all duration-300 `}
          >
            <ExpandMoreIcon />
          </span>
        </button>

        {showParticipants && (
          <div className='border mt-5 border-white rounded-[8px] px-10 lg:px-5 py-2 flex justify-between items-center backdrop-blur-sm bg-[#D1ECFF]/20 w-fit'>
            <div className='flex flex-col'>
              {participants ? (
                participants.addresses.map((address, index) => {
                  const formattedAddress = `${address.substring(
                    0,
                    6
                  )}...${address.substring(address.length - 3)}`;
                  const degenOrEnsName = participants.degenOrEnsNames?.[index];
                  const displayText = degenOrEnsName || formattedAddress;

                  return (
                    <div className='py-2' key={index}>
                      {displayText} - {weiToEther(participants.amounts[index])}{' '}
                      degen
                    </div>
                  );
                })
              ) : (
                <p>Loading addresses...</p>
              )}
            </div>
          </div>
        )}
      </div>
      <div>
        {/* {isOwner ?
<div className='mt-5'>
<CancelOpenBounty bountyId={bountyId} />
</div>
: null
} */}
      </div>
      <div>
        {isCurrentUserAParticipant && !isBountyClaimed && !isOwner ? (
          <Withdraw bountyId={bountyId} />
        ) : null}
      </div>

      <div>
        {!isCurrentUserAParticipant && !isBountyClaimed ? (
          <JoinBounty bountyId={bountyId} />
        ) : null}
      </div>
    </>
  );
};

export default BountyMultiplayer;
