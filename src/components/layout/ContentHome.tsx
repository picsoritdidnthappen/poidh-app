'use-client';

import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

import BountyList from '@/components/ui/BountyList';

import { networks } from '@/app/context/config';
import { fetchAllBounties } from '@/app/context/web3';
import { blacklistedBounties } from '@/constant/blacklist';

import { BountiesData } from '../../types/web3';

const ContentHome = () => {
  const { primaryWallet, network, isAuthenticated } = useDynamicContext();
  const [bountiesData, setBountiesData] = useState<BountiesData[]>([]);

  const [openBounties, setOpenBounties] = useState<BountiesData[]>([]);
  const [progressBounties, setProgressBounties] = useState<BountiesData[]>([]);
  const [pastBounties, setPastBounties] = useState<BountiesData[]>([]);

  const [loadedBountiesCount, setLoadedBountiesCount] = useState<number>(20);
  const [hasMoreBounties, setHasMoreBounties] = useState<boolean>(false);
  const [display, setDisplay] = useState('open');

  useEffect(() => {
    const fetchData = async () => {
      if (typeof window !== 'undefined') {
        // Client-side only
        const currentUrl = new URL(window.location.href);
        const hostname = currentUrl.hostname;
        const parts = hostname.split('.');

        let chain = '';
        switch (parts[0]) {
          case 'poidh.xyz':
            chain = 'degen';
            break;
          case 'localhost':
            chain = 'sepolia';
            break;
          case 'degen':
            chain = 'degen';
            break;
          case 'base':
            chain = 'base';
            break;
          default:
            chain = 'degen';
        }

        // eslint-disable-next-line unused-imports/no-unused-vars
        const targetChain = networks.find((n) => n.name === chain);
      }
    };

    fetchData();
  }, [isAuthenticated, network, primaryWallet]); // Re-run on route change

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchAllBounties();
        setBountiesData(data);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log('Error fetching bounties:', error);
      }
    };

    fetchData();
  }, [primaryWallet]);

  useEffect(() => {
    // Filter bountiesData into openBounties and pastBounties

    const open = bountiesData.filter(
      (bounty) =>
        bounty.claimer === '0x0000000000000000000000000000000000000000' &&
        !blacklistedBounties.includes(Number(bounty.id)) &&
        !bounty.inProgress
    );
    const progress = bountiesData.filter(
      (bounty) =>
        bounty.claimer === '0x0000000000000000000000000000000000000000' &&
        !blacklistedBounties.includes(Number(bounty.id)) &&
        bounty.inProgress
    );
    const past = bountiesData.filter(
      (bounty) =>
        bounty.claimer !== '0x0000000000000000000000000000000000000000' &&
        !blacklistedBounties.includes(Number(bounty.id)) &&
        !bounty.inProgress
    );

    setOpenBounties(open);
    setProgressBounties(progress);
    setPastBounties(past);

    // Update hasMoreBounties based on the total number of bounties
    setHasMoreBounties(bountiesData.length > loadedBountiesCount);
  }, [bountiesData, loadedBountiesCount]);

  const handleLoadMore = () => {
    // Increase the number of loaded bounties by 20
    setLoadedBountiesCount((prevCount) => prevCount + 20);
  };

  return (
    <>
      <div className='z-1 flex flex-nowrap container mx-auto border-b border-white py-12 w-full justify-center gap-2  px-8'>
        <div
          className={cn(
            'flex flex-nowrap border border-white rounded-full transition-all bg-gradient-to-r',
            'md:text-base sm:text-sm text-xs',
            display == 'open' && 'from-red-500 to-40%',
            display == 'progress' &&
              'via-red-500 from-transparent to-transparent from-[23.33%] to-[76.66%]',
            display == 'past' && 'from-transparent from-60% to-red-500',
            'gap-2 md:gap-4' // Adjust the gap as needed
          )}
        >
          <button
            onClick={() => setDisplay('open')}
            className='flex-grow sm:flex-grow-0 md:px-5 px-3 py-2'
          >
            new bounties
          </button>
          <button
            onClick={() => setDisplay('progress')}
            className='flex-grow sm:flex-grow-0 md:px-5 px-3 py-2'
          >
            voting in progress
          </button>
          <button
            onClick={() => setDisplay('past')}
            className='flex-grow sm:flex-grow-0 md:px-5 px-3 py-2'
          >
            past bounties
          </button>
        </div>
      </div>

      <div className='pb-20 z-1'>
        {/* Render either openBounties or pastBounties based on displayOpenBounties state */}
        {display == 'open' && <BountyList bountiesData={openBounties} />}
        {display == 'progress' && (
          <BountyList bountiesData={progressBounties} />
        )}
        {display == 'past' && <BountyList bountiesData={pastBounties} />}
      </div>
      {hasMoreBounties && (
        <div className='flex justify-center items-center pb-96'>
          <button
            className='border border-white rounded-full px-5  backdrop-blur-sm bg-[#D1ECFF]/20  py-2'
            onClick={handleLoadMore}
          >
            show more
          </button>
        </div>
      )}
    </>
  );
};

export default ContentHome;
