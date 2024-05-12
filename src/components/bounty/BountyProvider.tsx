import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  bountyCurrentVotingClaim,
  fetchBountyById,
  getParticipants,
} from '@/app/context/web3';

import { Bounty } from '@/types/web3';

interface BountyContextType {
  bountyData: Bounty | null;
  isOwner: boolean;
  isMultiplayer: boolean | null;
  isBountyClaimed: boolean | null;
  isBountyCanceled: boolean | null;
  isOwnerContributor: boolean | null;
}

const BountyContext = createContext<BountyContextType | null>(null);

export const useBountyContext = () => useContext(BountyContext);

export const BountyProvider = ({
  bountyId,
  children,
}: {
  bountyId: string;
  children: ReactNode;
}) => {
  const [bountyData, setBountyData] = useState<Bounty | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [isBountyClaimed, setIsBountyClaimed] = useState<boolean | null>(null);
  const [isBountyCanceled, setIsBountyCanceled] = useState<boolean | null>(
    null
  );
  const [isVoting, setIsVoting] = useState<boolean | null>(null);
  const [isOwnerContributor, setIsOwnerContributor] = useState<boolean | null>(
    null
  );

  const { user } = useDynamicContext();
  const currentUser = user?.verifiedCredentials[0].address;

  useEffect(() => {
    if (bountyId) {
      fetchBountyById(bountyId)
        .then((data) => {
          setBountyData(data);
          setIsOwner(currentUser === data.issuer);
          setIsBountyClaimed(
            data.claimer !== '0x0000000000000000000000000000000000000000'
          );
          setIsBountyCanceled(data.claimer === data.issuer);
        })
        .catch(console.error);

      getParticipants(bountyId)
        .then((openBounty) => {
          console.log('openBounty.addresses:');

          console.log(openBounty.addresses);
          setIsMultiplayer(openBounty.addresses.length > 0);

          setIsOwnerContributor(
            openBounty.addresses.every(
              (addr) =>
                addr === currentUser ||
                addr === '0x0000000000000000000000000000000000000000'
            )
          );
        })
        .catch(console.error);

      (async () => {
        const currentVotingClaim = await bountyCurrentVotingClaim(bountyId);
        setIsVoting(currentVotingClaim === 0);
      })();

      console.log('current voting:');
      console.log(isVoting);
    }
  }, [bountyId, currentUser]);

  return (
    <BountyContext.Provider
      value={{
        bountyData,
        isOwner,
        isMultiplayer,
        isBountyClaimed,
        isBountyCanceled,
        isOwnerContributor,
      }}
    >
      {children}
    </BountyContext.Provider>
  );
};
