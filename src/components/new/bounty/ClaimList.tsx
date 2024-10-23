import React from 'react';

import ClaimItem from '@/components/new/bounty/ClaimItem';
import Voting from '@/components/new/bounty/Voting';

type Claim = {
  id: string;
  issuer: string;
  bountyId: string;
  title: string;
  description: string;
  createdAt: bigint;
  accepted: boolean;
  url: string;
};

export default function ClaimList({
  bountyId,
  claims,
  votingClaim,
  isMultiplayer,
}: {
  bountyId: string;
  claims: Claim[];
  votingClaim: Claim | null;
  isMultiplayer: boolean;
}) {
  return (
    <>
      <div
        className={`${
          votingClaim ? '' : 'votingStarted'
        } container mx-auto px-0  py-12 flex flex-col gap-12 lg:grid lg:grid-cols-12 lg:gap-12 lg:px-0 `}
      >
        {votingClaim && (
          <div className='lg:col-span-4'>
            <ClaimItem
              isMultiplayer={isMultiplayer}
              bountyId={bountyId}
              id={votingClaim.id}
              title={votingClaim.title}
              description={votingClaim.description}
              issuer={votingClaim.issuer}
              accepted={votingClaim.accepted}
              url={votingClaim.url}
            />
          </div>
        )}
      </div>
      <div className='grid grid-cols-12'>
        {votingClaim && <Voting bountyId={bountyId} />}
      </div>

      <div
        className={`${
          votingClaim ? 'block' : 'hidden'
        } container mx-auto px-0  py-12 flex flex-col gap-12 lg:grid lg:grid-cols-12 lg:gap-12 lg:px-0`}
      >
        <p className={`col-span-12  ${!isMultiplayer ? 'hidden' : ' '}  `}>
          other claims
        </p>
        {claims
          .filter((claim) => claim.id !== votingClaim?.id)
          .map((claim) => (
            <div key={claim.id} className='lg:col-span-4 otherClaims'>
              <ClaimItem
                isMultiplayer={isMultiplayer}
                bountyId={bountyId}
                id={claim.id}
                title={claim.title}
                description={claim.description}
                issuer={claim.issuer}
                accepted={claim.accepted}
                url={claim.url}
              />
            </div>
          ))}
      </div>
    </>
  );
}
