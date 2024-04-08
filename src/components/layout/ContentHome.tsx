import { fetchBounties, fetchAllBounties } from "@/app/context/web3";
import BountyList from "@/components/ui/BountyList";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useEffect, useState } from "react";
import {  BountiesData } from '../../types/web3';






const ContentHome = () => {
  const { primaryWallet } = useDynamicContext();
  const [bountiesData, setBountiesData] = useState<BountiesData[]>([]);


  useEffect(() => {
   const data = async () => {
      try {
       fetchAllBounties()
       .then(data => {
       setBountiesData(data)
      })
      } catch (error) {
        console.log("this is error:" , error)
      }
   }    
    data()
  }, [primaryWallet]);


  return (
    <div className="pb-44">
      <BountyList bountiesData={bountiesData} />
    </div>
  );
};

export default ContentHome;