/* eslint-disable no-console */
import React, { useEffect, useState } from 'react';

import { useGetChain } from '@/hooks';
import { ClaimList, NoClaim, useBountyContext } from '@/components/bounty';
import { bountyCurrentVotingClaim, getClaimsByBountyId } from '@/app/context';
import { Blacklist, BlacklistedBounties } from '@/constant';
import { BlackListClaims, Claim } from '@/types';

const PAGE_SIZE = 18;

const BountyClaimss = ({ bountyId }: { bountyId: string }) => {
  const [claimsData, setClaimsData] = useState<Claim[] | null>(null);
  const [paginatedClaimsData, setPaginatedClaimsData] = useState<Claim[]>([]);
  const [currentVotingClaim, setCurrentVotingClaim] = useState<number | null>(
    null
  );
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const { isMultiplayer, isOwner } = useBountyContext()!;

  const clientChain = useGetChain();

  const getBlacklistedBounties = (chain: string | undefined): number[] => {
    if (!chain || !BlacklistedBounties[chain]) return [];
    return BlacklistedBounties[chain] as number[];
  };

  const isBountyBlacklisted = (id: string): boolean => {
    const blacklistedBountiesForChain = getBlacklistedBounties(clientChain);
    return blacklistedBountiesForChain.includes(Number(id));
  };

  const getBlacklistedClaims = (
    chain: string | undefined
  ): BlackListClaims[] => {
    if (!chain || !Blacklist[chain]) return [];
    return Blacklist[chain];
  };

  useEffect(() => {
    if (bountyId) {
      getClaimsByBountyId(bountyId)
        .then((data) => {
          let filteredClaims = data;
          const blacklistedClaims = getBlacklistedClaims(clientChain);
          const bounty = blacklistedClaims.find(
            (b) => b.bountyId === Number(bountyId)
          );
          if (bounty) {
            filteredClaims = filteredClaims.filter(
              (claim) => !bounty.claims.includes(Number(claim.id))
            );
          }
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

  if (isBountyBlacklisted(bountyId)) {
    return null;
  }

  return (
    <div>
      <div className='flex flex-col gap-x-2 py-4 border-b border-dashed'>
        <div>
          <span>({claimsData ? claimsData.length : 0})</span>
          <span>claims</span>
        </div>
      </div>
      {claimsData && claimsData.length > 0 ? (
        <ClaimList
          bountyId={bountyId}
          currentVotingClaim={currentVotingClaim}
          openBounty={isMultiplayer}
          youOwner={isOwner}
          data={paginatedClaimsData}
        />
      ) : (
        <NoClaim bountyId={bountyId} />
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

export default BountyClaimss;
