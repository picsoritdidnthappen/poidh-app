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

export function ClaimItemSkeleton() {
  return (
    <div className='p-[2px] relative border-white/10 border-2 rounded-xl animate-pulse'>
      <div className='w-full aspect-square bg-white/10 rounded-[8px]' />

      <div className='p-3'>
        <div className='flex flex-col'>
          <div className='flex items-center h-6'>
            <div className='h-4 w-[60%] rounded bg-white/10' />
          </div>

          <div className='h-20 pt-1 space-y-2'>
            <div className='h-3 w-full rounded bg-white/10' />
            <div className='h-3 w-[80%] rounded bg-white/10' />
          </div>
        </div>

        <div className='mt-2 py-2 flex flex-row items-center justify-between border-t border-dashed border-white/20'>
          <div className='h-5 w-12 rounded bg-white/10' />
          <div className='h-5 w-32 rounded bg-white/10' />
        </div>

        <div className='flex items-center h-6'>
          <div className='h-4 w-24 rounded bg-white/10' />
        </div>
      </div>
    </div>
  );
}

export function ClaimListSkeleton({ count }: { count: number }) {
  return (
    <div className='container mx-auto px-0 py-12 flex flex-col gap-12 lg:grid lg:grid-cols-12 lg:gap-12 lg:px-0'>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className='lg:col-span-4'>
          <ClaimItemSkeleton />
        </div>
      ))}
    </div>
  );
}
