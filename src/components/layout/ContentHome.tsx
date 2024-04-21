'use-client';

import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useEffect, useState } from "react";

import BountyList from "@/components/ui/BountyList";
import ToggleButton from "@/components/ui/ToggleButton";

import { networks } from "@/app/context/config";
import { fetchAllBounties } from "@/app/context/web3";

import { BountiesData } from '../../types/web3';


const ContentHome = () => {
  const { primaryWallet, network, isAuthenticated } = useDynamicContext();
  const [bountiesData, setBountiesData] = useState<BountiesData[]>([]);
  const [openBounties, setOpenBounties] = useState<BountiesData[]>([]);
  const [pastBounties, setPastBounties] = useState<BountiesData[]>([]);
  const [loadedBountiesCount, setLoadedBountiesCount] = useState<number>(20);
  const [hasMoreBounties, setHasMoreBounties] = useState<boolean>(false);
  const [displayOpenBounties, setDisplayOpenBounties] = useState<boolean>(false);

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
  
        const targetChain = networks.find(n => n.name === chain);

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
        console.log("Error fetching bounties:", error);
      }
    };

    fetchData();
  }, [primaryWallet]);

  useEffect(() => {
    // Filter bountiesData into openBounties and pastBounties
    const open = bountiesData.filter(bounty => bounty.claimer !== "0x0000000000000000000000000000000000000000");
    const past = bountiesData.filter(bounty => bounty.claimer === "0x0000000000000000000000000000000000000000");

    setOpenBounties(open);
    setPastBounties(past);

    // Update hasMoreBounties based on the total number of bounties
    setHasMoreBounties(bountiesData.length > loadedBountiesCount);
  }, [bountiesData, loadedBountiesCount]);

  const handleLoadMore = () => {
    // Increase the number of loaded bounties by 20
    setLoadedBountiesCount(prevCount => prevCount + 20);
  };

  const handleToggle = (option: string) => {
    // Toggle between displaying open and past bounties
    if (option === "Open Bounties") {
      setDisplayOpenBounties(true);
    } else if (option === "Past Bounties") {
      setDisplayOpenBounties(false);
    }
  };

  return (
    <>
      <div className="z-1">
        <ToggleButton option1="Open Bounties" option2="Past Bounties" handleToggle={handleToggle} />
      </div>
      <div className="pb-20 z-1">
        {/* Render either openBounties or pastBounties based on displayOpenBounties state */}
        <BountyList bountiesData={displayOpenBounties ? openBounties : pastBounties} />
      </div>
      {hasMoreBounties && (
        <div className="flex justify-center items-center pb-96">
          <button className="border border-white rounded-full px-5  backdrop-blur-sm bg-[#D1ECFF]/20  py-2" onClick={handleLoadMore}>show more</button>
        </div>
      )}
    </>
  );
};

export default ContentHome;
