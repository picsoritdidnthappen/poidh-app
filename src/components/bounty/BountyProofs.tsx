/* eslint-disable no-console */
import React, { useEffect, useState } from 'react';

import { useBountyContext } from '@/components/bounty/BountyProvider';
import NoProof from '@/components/bounty/NoProof';
import ProofList from '@/components/bounty/ProofList';

import {
  bountyCurrentVotingClaim,
  getClaimsByBountyId,
} from '@/app/context/web3';
import { blacklist, blacklistedBounties } from '@/constant/blacklist';

import { Claim } from '@/types/web3';

const PAGE_SIZE = 18;

const BountyProofs = ({ bountyId }: { bountyId: string }) => {
  const [claimsData, setClaimsData] = useState<Claim[] | null>(null);
  const [paginatedClaimsData, setPaginatedClaimsData] = useState<Claim[]>([]);
  const [currentVotingClaim, setCurrentVotingClaim] = useState<number | null>(
    null
  );
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const { isMultiplayer, isOwner } = useBountyContext()!;

  useEffect(() => {
    // setYouOwner(null);
    if (bountyId) {
      // getParticipants(bountyId)
      // .then((openBounty) => {
      //   setOpenBounty(openBounty.addresses.length === 0 ? false : true);
      // })
      // .catch(console.error);
      getClaimsByBountyId(bountyId)
        .then((data) => {
          // Filter claims based on blacklist criteria
          let filteredClaims = data;
          blacklist.forEach((bounty) => {
            if (bounty.bountyId === Number(bountyId)) {
              filteredClaims = filteredClaims.filter(
                (claim) => !bounty.claims.includes(Number(claim.id))
              );
            }
          });
          setClaimsData(filteredClaims);
          setPaginatedClaimsData(filteredClaims.slice(0, PAGE_SIZE));
        })
        .catch(console.error);

      (async () => {
        const currentVotingClaim = await bountyCurrentVotingClaim(bountyId);
        setCurrentVotingClaim(currentVotingClaim);
      })();
    }
  }, [bountyId]);

  const showMore = () => {
    const newData =
      claimsData?.slice(
        paginatedClaimsData.length,
        paginatedClaimsData.length + PAGE_SIZE
      ) ?? [];

    setPaginatedClaimsData([...paginatedClaimsData, ...newData]);
  };

  const hasMoreClaims = paginatedClaimsData.length < (claimsData?.length ?? 0);

  console.log('current voting claim:', currentVotingClaim);

  // Early exit if bountyId is blacklisted
  if (blacklistedBounties.includes(Number(bountyId))) {
    return null;
  }

  return (
    <div>
      <div className='flex flex-col gap-x-2 py-4 border-b border-dashed'>
        {/* <div>Currently voting on: {currentVotingClaim === 0 ? "no claim for vote selected" : currentVotingClaim}</div> */}
        <div>
          <span>({claimsData ? claimsData.length : 0})</span>
          <span>claims</span>
        </div>
      </div>
      {claimsData && claimsData.length > 0 ? (
        <ProofList
          bountyId={bountyId}
          currentVotingClaim={currentVotingClaim}
          openBounty={isMultiplayer}
          youOwner={isOwner}
          data={paginatedClaimsData}
        />
      ) : (
        <NoProof bountyId={bountyId} />
      )}
      {hasMoreClaims && (
        <div className='flex justify-center items-center pb-96'>
          <button
            onClick={showMore}
            className='border border-white rounded-full px-5  backdrop-blur-sm bg-[#D1ECFF]/20  py-2'
          >
            show more
          </button>
        </div>
      )}
    </div>
  );
};

export default BountyProofs;
