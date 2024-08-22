'use-client';

import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useGetChain } from '@/hooks';
import { cn } from '@/lib';
import { BountyList } from '@/components/ui';
import { fetchBounties, getContractRead } from '@/app/context';
import { BlacklistedBounties, PAGE_SIZE } from '@/constant/';
import { BountiesData } from '@/types';

type DisplayType = 'open' | 'progress' | 'past';

const ContentHome = () => {
  //States and Hooks
  // const { primaryWallet, network, isAuthenticated } = useDynamicContext();
  const [bountiesData, setBountiesData] = useState<BountiesData[]>([]);

  const [openBounties, setOpenBounties] = useState<BountiesData[]>([]);
  const [progressBounties, setProgressBounties] = useState<BountiesData[]>([]);
  const [pastBounties, setPastBounties] = useState<BountiesData[]>([]);

  const [loadedBountiesCount, setLoadedBountiesCount] =
    useState<number>(PAGE_SIZE);
  const [hasMoreBounties, setHasMoreBounties] = useState<boolean>(false);
  const [fetchingBounties, setFetchingBounties] = useState<boolean>(false);

  const [totalBounties, setTotalBounties] = useState<number>(0);
  const [display, setDisplay] = useState<DisplayType>('open');
  //const [clientChain, setClientChain] = useState<string>();

  const clientChain = useGetChain();
  const path = usePathname();

  const bountyDataMapping: { [key in DisplayType]: BountiesData[] } = {
    open: openBounties,
    progress: progressBounties,
    past: pastBounties,
  };

  // Special Functions

  const getBlacklistedBounties = (chain: string | undefined): number[] => {
    if (!chain || !BlacklistedBounties[chain]) return [];
    return BlacklistedBounties[chain] as number[];
  };

  const isBountyBlacklisted = (id: string): boolean => {
    const blacklistedBountiesForChain = getBlacklistedBounties(clientChain);
    return blacklistedBountiesForChain.includes(Number(id));
  };

  // useEffects

  // useEffect(() => {
  //   const fetchData = async () => {
  //     if (typeof window !== 'undefined') {
  //       // Refactor Change - Look to see if client side rendering works, or if this is a dev tool.
  //       // Client-side only
  //       const currentUrl = new URL(window.location.href);
  //       const hostname = currentUrl.hostname;
  //       const parts = hostname.split('.');

  //       let chain = '';
  //       switch (parts[0]) {
  //         case 'poidh.xyz':
  //           chain = 'degen';
  //           break;
  //         case 'localhost':
  //           chain = 'sepolia';
  //           break;
  //         case 'degen':
  //           chain = 'degen';
  //           break;
  //         case 'base':
  //           chain = 'base';
  //           break;
  //         default:
  //           chain = 'degen';
  //       }

  //       // eslint-disable-next-line unused-imports/no-unused-vars
  //       const targetChain = Networks.find((n) => n.name === chain);
  //     }
  //   };

  //   const networkUrl = path.split('/')[1];
  //   if (networkUrl === '') {
  //     setClientChain('base');
  //   } else {
  //     setClientChain(networkUrl);
  //   }

  //   //fetchData();
  // }, [isAuthenticated, network, primaryWallet]); // Re-run on route change

  useEffect(() => {
    // Refactor Change - Remove Console.log
    const fetchInitData = async () => {
      try {
        setFetchingBounties(true);

        const contractRead = await getContractRead();
        const bountyCounter = await contractRead.bountyCounter();
        const totalBounties = Number(bountyCounter.toString());
        const data = await fetchBounties(-PAGE_SIZE, PAGE_SIZE);

        setBountiesData(
          data.sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
        );
        setTotalBounties(totalBounties);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log('Error fetching bounties:', error);
      } finally {
        setFetchingBounties(false);
      }
    };

    fetchInitData();
  }, []);

  useEffect(() => {
    // Filter bountiesData into openBounties and pastBounties
    // Refactor Change - Look To Refactor this, and determine if more optimized to only use current state to filter bounties.
    const open = bountiesData.filter(
      (bounty) =>
        bounty.claimer === '0x0000000000000000000000000000000000000000' &&
        !isBountyBlacklisted(bounty.id) &&
        !bounty.inProgress
    );
    const progress = bountiesData.filter(
      (bounty) =>
        bounty.claimer === '0x0000000000000000000000000000000000000000' &&
        !isBountyBlacklisted(bounty.id) &&
        bounty.inProgress
    );
    const past = bountiesData.filter(
      (bounty) =>
        bounty.claimer !== '0x0000000000000000000000000000000000000000' &&
        !isBountyBlacklisted(bounty.id) &&
        !bounty.inProgress &&
        bounty.claimer !== bounty.issuer
    );

    setOpenBounties(open);
    setProgressBounties(progress);
    setPastBounties(past);

    // Update hasMoreBounties based on the total number of bounties
    setHasMoreBounties(loadedBountiesCount < totalBounties);
  }, [bountiesData, totalBounties, loadedBountiesCount]);

  // Refactor Change - Find out this function and if there is a special case for it being here, or if we can move it up to special functions.

  const handleLoadMore = async () => {
    try {
      setFetchingBounties(true);

      const offset = totalBounties - (loadedBountiesCount + PAGE_SIZE);
      const data = await fetchBounties(offset, PAGE_SIZE);

      setBountiesData((prevBountiesData) => {
        const result = [...prevBountiesData, ...data];
        return result.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
      });
      setLoadedBountiesCount((prevCount) => prevCount + PAGE_SIZE);
    } finally {
      setFetchingBounties(false);
    }
  };

  // JSX To Return
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
        {/* Render either openBounties or pastBounties based on displayOpenBounties state
        
        
        Refactor Change - Look To Refactor This so you use the state to use only one Bountylist component.
        */}

        <BountyList bountiesData={bountyDataMapping[display]} />
      </div>
      {hasMoreBounties && (
        <div className='flex justify-center items-center pb-96'>
          <button
            className='border border-white rounded-full px-5  backdrop-blur-sm bg-[#D1ECFF]/20  py-2'
            onClick={handleLoadMore}
            disabled={fetchingBounties}
          >
            {fetchingBounties ? 'loading...' : 'show more'}
          </button>
        </div>
      )}
    </>
  );
};

export default ContentHome;
