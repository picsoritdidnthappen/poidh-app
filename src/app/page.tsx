'use client';

import { NetworkSelector } from '@/components/global/NetworkSelector';
import NavBarMobile from '@/components/global/NavBarMobile';
import CreateBounty from '@/components/bounty/CreateBounty';
import { useScreenSize } from '@/hooks/useScreenSize';
import * as React from 'react';
import { trpc } from '@/trpc/client';

import 'react-toastify/dist/ReactToastify.css';
import PastBountyCard from '@/components/bounty/PastBountyCard';
import { ChainId, Claim } from '@/utils/types';

type DetailedClaim = {
  chainId: ChainId;
  bountyTitle: string;
  bountyAmount: string;
  isMultiplayer: boolean;
} & Claim;

const Home = () => {
  const isMobile = useScreenSize();
  const completedBountiesCount = trpc.completedBountiesCount.useQuery();
  const randomClaims = trpc.randomAcceptedClaims.useQuery({ limit: 24 });

  return (
    <>
      <div className='flex flex-col items-center justify-center text-center p-6 min-h-[85vh] pt-8 md:pt-24 lg:pt-32'>
        <h1 className='font-mono text-4xl mb-8'>poidh</h1>
        <h3 className='font-mono text-2xl mt-8 mb-4 tracking-wide'>
          you can just incentivize things
        </h3>
        <p className='text-lg mb-8'></p>
        <h3 className='font-mono text-xl mb-6 tracking-wide'>
          fund a bounty 💰
        </h3>
        <p className='text-lg mb-8'></p>
        <h3 className='font-mono text-xl mb-6 tracking-wide'>share it 📢</h3>
        <p className='text-lg mb-8'></p>
        <h3 className='font-mono text-xl mb-6 tracking-wide'>approve it 🤝</h3>

        <h3 className='font-mono text-2xl mt-8 mb-4 tracking-wide'>
          click the 🕹️ to get started
        </h3>
        <div className='mt-5 mb-6'>
          <NetworkSelector height={96} width={96} />
        </div>
        {randomClaims && !randomClaims.error && (
          <>
            <h3 className='font-mono text-2xl mt-8 mb-4 tracking-wide'>
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
                    isMultiplayer={claim.isMultiplayer}
                  />
                ))}
            </div>
          </>
        )}
      </div>
      {isMobile ? <NavBarMobile type='bounty' /> : <CreateBounty />}
    </>
  );
};

export default Home;
