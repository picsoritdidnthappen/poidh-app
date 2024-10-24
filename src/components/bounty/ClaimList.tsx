import React, { useEffect, useState } from 'react';

import { ClaimItem, Voting } from '@/components/bounty';

import { useBountyContext } from '@/components/bounty';

interface Claim {
  id: string;
  issuer: string;
  bountyId: string;
  bountyIssuer: string;
  name: string;
  description: string;
  createdAt: bigint;
  accepted: boolean;
}

interface ClaimListProps {
  data: Claim[];
  youOwner: boolean;
  openBounty: boolean | null;
  currentVotingClaim: number | null;
  bountyId: string;
}

const ClaimList: React.FC<ClaimListProps> = ({
  data,
  youOwner,
  openBounty,
  currentVotingClaim,
  bountyId,
}) => {
  const [isAccepted, setIsAccepted] = useState(true);
  const { isMultiplayer } = useBountyContext()!;

  useEffect(() => {
    const checkAccepted = data.some((claim) => claim.accepted === true);
    setIsAccepted(checkAccepted);
  }, [data]);

  return (
    <>
      <div
        className={`${
          currentVotingClaim === 0 ? '' : 'votingStarted'
        } container mx-auto px-0  py-12 flex flex-col gap-12 lg:grid lg:grid-cols-12 lg:gap-12 lg:px-0 `}
      >
        {data.map((claim) => (
          <div
            key={claim.id}
            className={`${
              currentVotingClaim === 0 ||
              currentVotingClaim === Number(claim.id)
                ? ''
                : 'hidden'
            } lg:col-span-4`}
          >
            <ClaimItem
              openBounty={openBounty}
              isAccepted={isAccepted}
              youOwner={youOwner}
              bountyId={claim.bountyId}
              key={claim.id}
              id={claim.id}
              title={claim.name}
              description={claim.description}
              issuer={claim.issuer}
              accepted={claim.accepted}
            />
          </div>
        ))}
      </div>
      <div className='grid grid-cols-12'>
        {currentVotingClaim !== 0 ? <Voting bountyId={bountyId} /> : null}
      </div>

      <div
        className={`${
          currentVotingClaim !== 0 ? 'block' : 'hidden'
        } container mx-auto px-0  py-12 flex flex-col gap-12 lg:grid lg:grid-cols-12 lg:gap-12 lg:px-0`}
      >
        <p className={`col-span-12  ${!isMultiplayer ? 'hidden' : ' '}  `}>
          other claims
        </p>
        {data.map((claim) => (
          <div
            key={claim.id}
            className={`${
              currentVotingClaim === 0 ||
              currentVotingClaim === Number(claim.id)
                ? 'hidden'
                : ''
            } lg:col-span-4 otherClaims`}
          >
            <ClaimItem
              openBounty={openBounty}
              isAccepted={isAccepted}
              youOwner={youOwner}
              bountyId={claim.bountyId}
              key={claim.id}
              id={claim.id}
              title={claim.name}
              description={claim.description}
              issuer={claim.issuer}
              accepted={claim.accepted}
            />
          </div>
        ))}
      </div>
    </>
  );
};

export default ClaimList;
