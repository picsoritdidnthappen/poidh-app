import { fetchBounties } from "@/app/context/web3";
import BountyList from "@/components/ui/BountyList";
import ToggleButton from "@/components/ui/ToggleButton";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
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



const ContentHome = () => {
  const { primaryWallet } = useDynamicContext();
  const [bountiesData, setBountiesData] = useState<BountiesData[]>([]);


  useEffect(() => {
   const data = async () => {
      try {
       fetchBounties(0)
       .then(data => {
       setBountiesData(data)
      })
      } catch (error) {
        console.log("this is error:" , error)
      }
   }    
    data()
  }, [primaryWallet]);

  // console.log(bountiesData)

  return (
    <div className="pb-44">
      <BountyList bountiesData={bountiesData} />
    </div>
  );
};

export default ContentHome;