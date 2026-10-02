import { useState } from 'react';

import { trpc } from '@/trpc/client';
import { useChainInfo } from '@/hooks/useChainInfo';
import InfiniteScroll from 'react-infinite-scroller';
import ClaimList, { ClaimListSkeleton } from '../claims/ClaimList';
import { CommentsIcon } from '@/components/global/Icons';
import { ChainId } from '@/utils/types';

const PAGE_SIZE = 9;

const SKELETON_COUNT = 3;

export default function BountyClaims({ bountyId }: { bountyId: number }) {
  const chain = useChainInfo();
  const [infiniteEnabled, setInfiniteEnabled] = useState(true);

  const claims = trpc.claims.fetchBountyClaims.useInfiniteQuery(
    {
      bountyId,
      chainId: chain.id,
      limit: PAGE_SIZE,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      enabled: !isNaN(bountyId),
    }
  );

  const bountyClaimsCount = trpc.bounties.claimsCount.useQuery(
    {
      bountyId,
      chainId: chain.id,
    },
    {
      enabled: !isNaN(bountyId),
    }
  );

  const { data: votingClaim } = trpc.claims.fetchVotingClaimByBountyId.useQuery(
    {
      bountyId,
      chainId: chain.id,
    }
  );

  // Voting mounts only once the claims have loaded, so start its query now
  trpc.bounties.fetchVoting.useQuery(
    { bountyId, chainId: chain.id },
    { enabled: !!votingClaim }
  );

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
          {bountyClaimsCount.data === undefined ? (
            <span className='h-5 w-20 rounded bg-white/10 animate-pulse' />
          ) : (
            <span>{Number(bountyClaimsCount.data) || 0} claims</span>
          )}
        </div>
        <div
          onClick={handleScrollToComments}
          className='flex items-center px-2 py-1 rounded-md cursor-pointer hover:bg-white/20 transition-colors'
        >
          <CommentsIcon size={24} />
        </div>
      </div>
      {claims.isLoading ? (
        <ClaimListSkeleton
          count={
            bountyClaimsCount.data === undefined
              ? SKELETON_COUNT
              : Math.min(Number(bountyClaimsCount.data), PAGE_SIZE)
          }
        />
      ) : !claims.data ||
        claims.data?.pages.reduce(
          (acc, p) => acc + (p.items?.length || 0),
          0
        ) === 0 ? (
        <div className='flex items-center justify-center min-h-[15vh] mt-10 text-center text-sm text-[#D1ECFF]'>
          no claims yet. submit yours first!
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
            key={`bounty-claim-${claims.data?.pageParams}`}
            votingClaim={
              votingClaim
                ? { ...votingClaim, chainId: votingClaim.chainId as ChainId }
                : null
            }
            claims={
              claims.data?.pages.flatMap((page) => {
                return (page.items || []).map((item) => ({
                  ...item,
                  chainId: item.chainId as ChainId,
                }));
              }) ?? []
            }
          />
        </InfiniteScroll>
      )}
    </div>
  );
}
