import { fetchAllBounties } from "@/app/context/web3";
import BountyList from "@/components/ui/BountyList";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useEffect, useState } from "react";
import { BountiesData } from '../../types/web3';
import ToggleButton from "@/components/ui/ToggleButton";

const ContentHome = () => {
  const { primaryWallet } = useDynamicContext();
  const [bountiesData, setBountiesData] = useState<BountiesData[]>([]);
  const [openBounties, setOpenBounties] = useState<BountiesData[]>([]);
  const [pastBounties, setPastBounties] = useState<BountiesData[]>([]);
  const [loadedBountiesCount, setLoadedBountiesCount] = useState<number>(20);
  const [hasMoreBounties, setHasMoreBounties] = useState<boolean>(false);
  const [displayOpenBounties, setDisplayOpenBounties] = useState<boolean>(false);

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
      <div>
        <ToggleButton option1={"Open Bounties"} option2={"Past Bounties"} handleToggle={handleToggle} />
      </div>
      <div className="pb-20">
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
