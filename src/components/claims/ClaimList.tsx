import Voting from '@/components/bounty/Voting';
import { Claim } from '@/utils/types';
import ClaimItem from './ClaimItem';

export default function ClaimList({
  claims,
  votingClaim,
}: {
  claims: Claim[];
  votingClaim: Claim | null;
}) {
  const isVotingOrAcceptedBounty =
    !!votingClaim || claims.some((claim) => claim.isAccepted);

  return (
    <>
      <div
        className={`${
          votingClaim ? 'votingStarted' : ''
        } container mx-auto px-4 py-4 flex flex-col gap-12 lg:grid lg:grid-cols-12 lg:gap-12 lg:px-0 lg:items-center`}
      >
        {votingClaim && (
          <>
            <div className='lg:col-start-3 lg:col-span-4 mt-5'>
              <ClaimItem
                claim={{
                  ...votingClaim,
                  isVotingOrAcceptedBounty,
                }}
              />
            </div>
            <div className='lg:col-span-4'>
              <Voting
                bountyId={claims?.[0].bountyId}
                isAcceptedBounty={claims.some((claim) => claim.isAccepted)}
                votingClaim={votingClaim}
              />
            </div>
          </>
        )}
      </div>

      <div className='container mx-auto px-0  py-12 flex flex-col gap-12 lg:grid lg:grid-cols-12 lg:gap-12 lg:px-0'>
        {votingClaim && claims.length > 1 && (
          <p className='col-span-12'>other claims</p>
        )}
        {claims
          .filter((claim) => claim.id !== votingClaim?.id)
          .map((claim) => (
            <div
            key={`${claim.chainId}-${claim.id}`}
            className='lg:col-span-4 otherClaims'
            >
              <ClaimItem claim={{ ...claim, isVotingOrAcceptedBounty }} />
            </div>
          ))}
      </div>
    </>
  );
}
