import Voting from '@/components/bounty/Voting';
import { Claim } from '@/utils/types';
import ClaimItem from './ClaimItem';
import { trpc } from '@/trpc/client';
import { useChainInfo } from '@/hooks/useChainInfo';
import { isV3Bounty } from '@/utils/utils';

export default function ClaimList({
  claims,
  votingClaim,
}: {
  claims: Claim[];
  votingClaim: Claim | null;
}) {
  const isVotingOrAcceptedBounty =
    !!votingClaim || claims.some((claim) => claim.isAccepted);

  // For legacy (v2) multiplayer bounties, the on-chain voting flow does not
  // record entries in the off-chain `votes` table, so `votingClaim` is null
  // even when the bounty went through voting. Surface the accepted claim
  // instead so the voting breakdown panel still renders. (Closes #1276)
  const chain = useChainInfo();
  const acceptedClaim = claims.find((claim) => claim.isAccepted) ?? null;
  const bountyOnChainId = claims[0]?.bountyId
    ? Number(claims[0].bountyId)
    : undefined;
  const bountyMeta = trpc.bounties.fetch.useQuery(
    {
      id: bountyOnChainId ?? 0,
      chainId: chain.id,
    },
    {
      enabled: bountyOnChainId !== undefined && !votingClaim && !!acceptedClaim,
    }
  );
  const isLegacyV2VotedBounty =
    !votingClaim &&
    !!acceptedClaim &&
    !!bountyMeta.data?.isMultiplayer &&
    bountyMeta.data?.onChainId !== undefined &&
    !isV3Bounty(chain.id, bountyMeta.data.onChainId);

  const effectiveVotingClaim =
    votingClaim ?? (isLegacyV2VotedBounty ? acceptedClaim : null);

  return (
    <>
      <div
        className={`${
          effectiveVotingClaim ? 'votingStarted' : ''
        } container mx-auto px-4 py-4 flex flex-col gap-12 lg:grid lg:grid-cols-12 lg:gap-12 lg:px-0 lg:items-center`}
      >
        {effectiveVotingClaim && (
          <>
            <div className='lg:col-start-3 lg:col-span-4 mt-5'>
              <ClaimItem
                claim={{
                  ...effectiveVotingClaim,
                  isVotingOrAcceptedBounty,
                }}
              />
            </div>
            <div className='lg:col-span-4'>
              <Voting
                bountyId={claims?.[0].bountyId}
                isAcceptedBounty={claims.some((claim) => claim.isAccepted)}
                votingClaim={effectiveVotingClaim}
              />
            </div>
          </>
        )}
      </div>

      <div className='container mx-auto px-0  py-12 flex flex-col gap-12 lg:grid lg:grid-cols-12 lg:gap-12 lg:px-0'>
        {effectiveVotingClaim && claims.length > 1 && (
          <p className='col-span-12'>other claims</p>
        )}
        {claims
          .filter((claim) => claim.id !== effectiveVotingClaim?.id)
          .map((claim) => (
            <div key={claim.id} className='lg:col-span-4 otherClaims'>
              <ClaimItem claim={{ ...claim, isVotingOrAcceptedBounty }} />
            </div>
          ))}
      </div>
    </>
  );
}
