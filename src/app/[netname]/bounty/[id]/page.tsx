'use client';
import React, { useState } from 'react';
import BountyClaims from '@/components/bounty/BountyClaims';
import BountyInfo from '@/components/bounty/BountyInfo';
import NavBarMobile from '@/components/global/NavBarMobile';
import { useScreenSize } from '@/hooks/useScreenSize';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { trpc, trpcClient } from '@/trpc/client';
import { useGetChain } from '@/hooks/useGetChain';
import Loading from '@/components/global/Loading';
import CreateClaim from '@/components/claims/CreateClaim';

export default function Bounty({ params }: { params: { id: string } }) {
  const chain = useGetChain();
  const searchParams = useSearchParams();
  const isMobile = useScreenSize();
  const utils = trpc.useUtils();
  const [status, setStatus] = useState('Indexing…');

  const indexingMutation = useQuery({
    queryKey: ['indexing'],
    queryFn: async () => {
      setStatus('Indexing 1s');
      for (let i = 0; i < 60; i++) {
        setStatus(`Indexing ${i}s`);
        const bounty = await trpcClient.isBountyCreated.query({
          id: Number(params.id),
          chainId: chain.id,
        });

        if (bounty) {
          utils.bounty.invalidate();
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }

      throw new Error('Failed to index bounty');
    },
    enabled: searchParams.get('indexing') === 'true',
  });

  return (
    <>
      <Loading open={indexingMutation.isLoading} status={status} />
      <div className='px-5 lg:px-20'>
        <BountyInfo bountyId={params.id} />
        <BountyClaims bountyId={params.id} />
      </div>
      {isMobile ? (
        <NavBarMobile type='claim' bountyId={params.id} />
      ) : (
        <CreateClaim bountyId={params.id} />
      )}
      <div className='h-80' />
    </>
  );
}
