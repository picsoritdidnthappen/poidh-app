import React from 'react';

import Voting from '@/components/bounty/Voting';
import { Claim } from '@/utils/types';
import ClaimItem from './ClaimItem';

export default function ClaimList({
  bountyId,
  claims,
  votingClaim,
}: {
  bountyId: string;
  claims: Claim[];
  votingClaim: Claim | null;
}) {
  const isVotingOrAcceptedBounty =
    !!votingClaim || claims.some((claim) => claim.accepted);

  return (
    <>
      <div
        className={`${
          votingClaim ? 'votingStarted' : ''
        } container mx-auto px-0 py-4 flex flex-col gap-12 lg:grid lg:grid-cols-12 lg:gap-12 lg:px-0 `}
      >
        {votingClaim && (
          <div className='lg:col-span-4'>
            <ClaimItem
              bountyId={bountyId}
              id={votingClaim.id}
              title={votingClaim.title}
              description={votingClaim.description}
              issuer={votingClaim.issuer}
              accepted={votingClaim.accepted}
              url={votingClaim.url}
              isVotingOrAcceptedBounty={isVotingOrAcceptedBounty}
            />
          </div>
        )}
      </div>
      <div className='grid grid-cols-12'>
        {votingClaim && (
          <Voting
            bountyId={bountyId}
            isAcceptedBounty={claims.some((claim) => claim.accepted)}
          />
        )}
      </div>

      <div className='container mx-auto px-0  py-12 flex flex-col gap-12 lg:grid lg:grid-cols-12 lg:gap-12 lg:px-0'>
        {votingClaim && <p className='col-span-12'>other claims</p>}
        {claims
          .filter((claim) => claim.id !== votingClaim?.id)
          .map((claim) => (
            <div key={claim.id} className='lg:col-span-4 otherClaims'>
              <ClaimItem
                bountyId={bountyId}
                id={claim.id}
                title={claim.title}
                description={claim.description}
                issuer={claim.issuer}
                accepted={claim.accepted}
                url={claim.url}
                isVotingOrAcceptedBounty={isVotingOrAcceptedBounty}
              />
            </div>
          ))}
      </div>
    </>
  );
}
