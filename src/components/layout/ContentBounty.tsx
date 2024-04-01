import { fetchBounties } from "@/app/context/web3";
import BountyInfo from "@/components/bounty/BountyInfo";
import BountyProofs from "@/components/bounty/BountyProofs";
import BountyList from "@/components/ui/BountyList";
import ToggleButton from "@/components/ui/ToggleButton";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface BountiesData {
  id: string;
  issuer: string;
  name: string;
  description: string;
  value: string;
  claimer: string;
  createdAt: string;
  claimId: string;
}



const ContentBounty = () => {
  const { primaryWallet } = useDynamicContext();
  // const [bountiesData, setBountiesData] = useState<BountiesData[]>([]);

  const pathname = usePathname()
  const bountyId = pathname.split('/').pop() || ''; 

  // useEffect(() => {
  //   if (primaryWallet) {
  //     fetchBounties(0)
  //     .then(data => {
  //       setBountiesData(data)
  //     })
  //     .catch(console.error);
  //     }
  //   }, [primaryWallet]);

  return (
    <div className="pb-44">
    <BountyInfo bountyId={bountyId} />
    <BountyProofs bountyId={bountyId}  />
    </div>
  );
};

export default ContentBounty;