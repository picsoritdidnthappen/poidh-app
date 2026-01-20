import { useState } from 'react';

import { trpc } from '@/trpc/client';
import { useChainInfo } from '@/hooks/useChainInfo';
import InfiniteScroll from 'react-infinite-scroller';
import ClaimList from '../claims/ClaimList';
import { CommentsIcon } from '@/components/global/Icons';
import { ChainId } from '@/utils/types';

const PAGE_SIZE = 9;

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
      enabled: !!bountyId,
    }
  );

  const bountyClaimsCount = trpc.bounties.claimsCount.useQuery(
    {
      bountyId,
      chainId: chain.id,
    },
    {
      enabled: !!bountyId,
    }
  );

  const { data: votingClaim } = trpc.claims.fetchVotingClaimByBountyId.useQuery(
    {
      bountyId,
      chainId: chain.id,
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
