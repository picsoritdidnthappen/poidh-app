import React, { useEffect, useState } from 'react';

import { trpc } from '@/trpc/client';
import { useGetChain } from '@/hooks/useGetChain';
import ClaimList from '@/components/bounty/ClaimList';
import { bountyCurrentVotingClaim } from '@/utils/web3';

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
  }, [bountyId]);

  const claims = trpc.bountyClaims.useInfiniteQuery(
    {
      bountyId,
      chainId: chain.id.toString(),
      limit: PAGE_SIZE,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor?.toString(),
      enabled: !!bountyId,
    }
  );

  const { data: votingClaim } = trpc.claim.useQuery(
    {
      claimId: votingClaimId?.toString() ?? '',
      chainId: chain.id.toString(),
    },
    {
      enabled: !!votingClaimId,
    }
  );

  const { data: bounty } = trpc.bounty.useQuery(
    {
      id: bountyId,
      chainId: chain.id.toString(),
    },
    {
      enabled: !!bountyId,
    }
  );

  if (!claims) {
    return null;
  }

  return (
    <div>
      <div className='flex flex-col gap-x-2 py-4 border-b border-dashed'>
        <div>
          <span>
            {claims.data?.pages.reduce(
              (acc, curr) => acc + curr.items.length,
              0
            )}{' '}
            claims
          </span>
        </div>
      </div>
      {claims.data && (
        <ClaimList
          bountyId={bountyId}
          isMultiplayer={bounty?.isMultiplayer || false}
          votingClaim={
            votingClaim
              ? {
                  ...votingClaim,
                  accepted: Boolean(votingClaim?.accepted),
                  id: votingClaim?.primaryId.toString(),
                  bountyId: votingClaim?.bountyId.toString(),
                  createdAt: BigInt(votingClaim?.createdAt.toString()),
                  issuer: votingClaim?.issuer.id,
                }
              : null
          }
          claims={claims.data.pages.flatMap((page) => {
            return page.items.map((item) => ({
              ...item,
              accepted: Boolean(item.accepted),
              id: item.primaryId.toString(),
              issuer: item.issuer.id,
              bountyId: item.bountyId.toString(),
              createdAt: BigInt(item.createdAt.toString()),
            }));
          })}
        />
      )}
      {claims.hasNextPage && (
        <div className='flex justify-center items-center'>
          <button
            onClick={() => claims.fetchNextPage()}
            className='border border-white rounded-full px-5 backdrop-blur-sm bg-[#D1ECFF]/20 py-2'
            disabled={claims.isFetchingNextPage}
          >
            {claims.isFetchingNextPage ? 'loading…' : 'show more'}
          </button>
        </div>
      )}
    </div>
  );
}
