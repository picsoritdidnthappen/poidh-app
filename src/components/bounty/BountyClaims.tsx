import React, { useEffect, useState } from 'react';

import { trpc } from '@/trpc/client';
import { useGetChain } from '@/hooks/useGetChain';
import InfiniteScroll from 'react-infinite-scroller';
import { bountyCurrentVotingClaim } from '@/utils/web3';
import ClaimList from '../claims/ClaimList';

const PAGE_SIZE = 9;

export default function BountyClaims({ bountyId }: { bountyId: string }) {
  const chain = useGetChain();
  const [votingClaimId, setVotingClaimId] = useState<number | null>(null);

  useEffect(() => {
    const fetchCurrentVotingClaim = async () => {
      const currentVotingClaim = await bountyCurrentVotingClaim({
        id: bountyId,
        chainName: chain.slug,
      });
      setVotingClaimId(currentVotingClaim);
    };

    fetchCurrentVotingClaim();
  }, [bountyId, chain]);

  const claims = trpc.bountyClaims.useInfiniteQuery(
    {
      bountyId: Number(bountyId),
      chainId: chain.id,
      limit: PAGE_SIZE,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      enabled: !!bountyId,
    }
  );

  const bountyClaimsCount = trpc.bountyClaimsCount.useQuery(
    {
      bountyId: Number(bountyId),
      chainId: chain.id,
    },
    {
      enabled: !!bountyId,
    }
  );

  const { data: votingClaim } = trpc.claim.useQuery(
    {
      claimId: Number(votingClaimId),
      chainId: chain.id,
    },
    {
      enabled: !!votingClaimId,
    }
  );

  if (!claims) {
    return <div className=''>No claims</div>;
  }

  return (
    <div>
      <div className='flex flex-col gap-x-2 py-4 border-b border-dashed'>
        <div>
          <span>{Number(bountyClaimsCount.data) || 0} claims</span>
        </div>
      </div>
      {claims.data && (
        <InfiniteScroll
          loadMore={async () => await claims.fetchNextPage()}
          hasMore={claims.hasNextPage && !claims.isFetchingNextPage}
          loader={
            <div key='loader' className='animate-pulse text-center'>
              Loading more...
            </div>
          }
          threshold={300}
        >
          <ClaimList
            key={claims.data.pages[0]?.items[0]?.id || 'empty-list'}
            bountyId={bountyId}
            votingClaim={
              votingClaim
                ? {
                    ...votingClaim,
                    accepted: votingClaim.is_accepted || false,
                    id: votingClaim.id.toString(),
                    bountyId: votingClaim.bounty_id.toString(),
                    issuer: votingClaim.issuer,
                  }
                : null
            }
            claims={claims.data.pages.flatMap((page) => {
              return page.items.map((item) => ({
                ...item,
                accepted: item.is_accepted || false,
                id: item.id.toString(),
                issuer: item.issuer,
                bountyId: item.bounty_id.toString(),
              }));
            })}
          />
        </InfiniteScroll>
      )}
    </div>
  );
}
