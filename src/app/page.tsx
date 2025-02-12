'use client';

import { NetworkSelector } from '@/components/global/NetworkSelector';
import * as React from 'react';
import { trpc } from '@/trpc/client';

import 'react-toastify/dist/ReactToastify.css';
import PastBountyCard from '@/components/bounty/PastBountyCard';
import { ChainId, Claim } from '@/utils/types';

type DetailedClaim = {
  chainId: ChainId;
  bountyTitle: string;
  bountyAmount: string;
} & Claim;

const Home = () => {
  const completedBountiesCount = trpc.completedBountiesCount.useQuery();
  const randomClaims = trpc.randomAcceptedClaims.useQuery({ limit: 24 });

  return (
    <div className='flex flex-col items-center justify-center text-center p-6 min-h-[85vh] pt-8 md:pt-24 lg:pt-32'>
      <h1 className='text-4xl mb-8'>poidh</h1>
      <p className='text-lg mb-8'>the easiest way to get stuff done</p>

      <h3 className='text-2xl mb-6'>step 1 - fund a bounty 💰</h3>
      <p className='mb-6'>
        write a bounty description and deposit funds to incentivize task
        completion
      </p>

      <h3 className='text-2xl mb-6'>step 2 - share the bounty 📢</h3>
      <p className='mb-6'>
        get your bounty in front of people who are interested in completing it
      </p>

      <h3 className='text-2xl mb-6'>step 3 - approve a claim 🤝</h3>
      <p className='mb-6'>
        monitor your submissions and confirm a claim with a single click
      </p>
      <h3 className='text-2xl mt-8 mb-4'>select a network to get started</h3>
      <NetworkSelector height={60} width={60} />
      {randomClaims && !randomClaims.error && (
        <>
          <h3 className='text-2xl mt-8 mb-4'>
            or browse some of the
            <span
              className='text-poidhRed'
              style={{ textShadow: '1px 1px 2px white' }}
            >{` ${
              // 278 - the amount of completed bounties in poidh v1
              completedBountiesCount.data
                ? completedBountiesCount.data + 278
                : '???'
            } `}</span>
            completed bounties
          </h3>
          {randomClaims.isLoading && (
            <p className='animate-pulse mt-5 text-lg'>Loading...</p>
          )}
          <div className='container mx-auto px-0 py-4 flex flex-col gap-12 lg:grid lg:grid-cols-12 lg:gap-12 lg:px-0 pb-16 mt-5'>
            {Array.isArray(randomClaims?.data) &&
              randomClaims?.data?.map((claim: DetailedClaim) => (
                <PastBountyCard
                  key={`${claim.id}-${claim.chainId}`}
                  claim={claim}
                  bountyTitle={claim.bountyTitle}
                  bountyAmount={claim.bountyAmount}
                />
              ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Home;
