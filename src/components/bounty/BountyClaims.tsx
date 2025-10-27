import React, { useEffect, useState } from 'react';

import { trpc } from '@/trpc/client';
import { useGetChain } from '@/hooks/useGetChain';
import InfiniteScroll from 'react-infinite-scroller';
import { bountyCurrentVotingClaim } from '@/utils/web3';
import ClaimList from '../claims/ClaimList';
import { CommentsIcon } from '@/components/global/Icons';

const PAGE_SIZE = 9;

export default function BountyClaims({ bountyId }: { bountyId: string }) {
  const chain = useGetChain();
  const [votingClaimId, setVotingClaimId] = useState<number | null>(null);
  const [infiniteEnabled, setInfiniteEnabled] = useState(true);

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

  if (claims.isLoading) {
    return (
      <div className='flex items-center justify-center min-h-[15vh] mt-10 text-center text-sm text-[#D1ECFF]'>
        Loading claims...
      </div>
    );
  }

  const handleScrollToComments = () => {
    setInfiniteEnabled(false);
    document.getElementById('comments-section')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
    setTimeout(() => {
      setInfiniteEnabled(true);
    }, 1000);
  };

  return (
    <div>
      <div className='flex flex-row justify-between gap-x-2 py-4 pb-2 border-b border-dashed'>
        <div className='flex items-center'>
          <span>{Number(bountyClaimsCount.data) || 0} claims</span>
        </div>
        <div
          onClick={handleScrollToComments}
          className='flex items-center px-2 py-1 rounded-md cursor-pointer hover:bg-white/20 transition-colors'
        >
          <CommentsIcon size={24} />
        </div>
      </div>
      {!claims.isLoading &&
      (!claims.data ||
        claims.data?.pages.reduce(
          (acc, p) => acc + (p.items?.length || 0),
          0
        ) === 0) ? (
        <div className='flex items-center justify-center min-h-[15vh] mt-10 text-center text-sm text-[#D1ECFF]'>
          no claims yet. be the first to make a claim
        </div>
      ) : (
        <InfiniteScroll
          loadMore={async () =>
            infiniteEnabled && (await claims.fetchNextPage())
          }
          hasMore={
            infiniteEnabled && claims.hasNextPage && !claims.isFetchingNextPage
          }
          loader={
            <div key='loader' className='animate-pulse text-center'>
              Loading more...
            </div>
          }
          threshold={300}
        >
          <ClaimList
            key={claims.data?.pages?.[0]?.items?.[0]?.id ?? 'empty-list'}
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
            claims={
              claims.data?.pages.flatMap((page) => {
                return (page.items || []).map((item) => ({
                  ...item,
                  accepted: item.is_accepted || false,
                  id: item.id.toString(),
                  issuer: item.issuer,
                  bountyId: item.bounty_id.toString(),
                }));
              }) ?? []
            }
          />
        </InfiniteScroll>
      )}
    </div>
  );
}
