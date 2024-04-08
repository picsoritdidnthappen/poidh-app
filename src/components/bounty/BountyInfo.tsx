import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useEffect, useState } from 'react';
import { fetchBountyById, getParticipants } from '@/app/context/web3';
import CreateProof from '@/components/ui/CreateProof';
import JoinBounty from '@/components/ui/JoinBounty';
import {OpenBounty, Bounty} from '../../types/web3';
import BountyMultiplayer from '@/components/bounty/BountyMultiplayer';
import { useBountyContext } from '@/components/bounty/BountyProvider';



function weiToEther(weiValue: string | number): string {
  const etherValue = Number(weiValue) / 1e18;
  return etherValue.toFixed(6); 
}

const BountyInfo = ({ bountyId }: { bountyId: string }) => {

  
  const { isMultiplayer, isOwner, bountyData, isBountyClaimed} = useBountyContext()!;


  console.log("Is multiplayer:", isMultiplayer)
  console.log("Is Owner:", isOwner)
  console.log("Is Claimed:", isBountyClaimed)


  

  return (
    <>
    <div className="flex pt-20 justify-between">
      <div className="flex flex-col lg:max-w-[50%]">
        <p className="text-4xl text-bold">{bountyData?.name}</p>
        <p className="mt-5">{bountyData?.description}</p>
       
      </div>

      <div className='flex flex-col'>
      <div className="flex gap-x-2 flex-row">
        <span>{bountyData ? weiToEther(bountyData.amount) : "Loading..."}</span>
        <span>eth</span>
      </div>
      <div>{isMultiplayer? "this is multiplayer" : "no this is solo"}</div>
      <div> {!isBountyClaimed && !isOwner ? <CreateProof bountyId={bountyId} /> : ""}</div>
     

      </div>

      

    </div>

    {isMultiplayer ? 
    <div>

      <BountyMultiplayer bountyId={bountyId} />
    
    </div> : null}


   
    </>
  );
};

export default BountyInfo;
