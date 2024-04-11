import BountyMultiplayer from '@/components/bounty/BountyMultiplayer';
import { useBountyContext } from '@/components/bounty/BountyProvider';
import CreateProof from '@/components/ui/CreateProof';



function weiToEther(weiValue: string | number): string {
  const etherValue = Number(weiValue) / 1e18;
  return etherValue.toFixed(6); 
}

const BountyInfo = ({ bountyId }: { bountyId: string }) => {

  
  const { isMultiplayer, isOwner, bountyData, isBountyClaimed, isBountyCanceled} = useBountyContext()!;


  console.log("Is multiplayer:", isMultiplayer)
  console.log("Is Owner:", isOwner)
  console.log("Is Claimed:", isBountyClaimed)


  

  return (
    <>
    <div className="flex pt-20 flex-col  justify-between lg:flex-row">
      <div className="flex flex-col  lg:max-w-[50%]">
        <p className=" text-2xl lg:text-4xl text-bold">{bountyData?.name}</p>
        <p className="mt-5">{bountyData?.description}</p>
        <p>Bounty issuer: {bountyData?.issuer}</p>
       
        <div>
            <p>Debug:</p>

            <p>is Owner: {isOwner ? "true" : "false"}</p>
            <p>isBountyClaimed: {isBountyClaimed ? "true" : "false"}</p>
            <p>isMultiplayer: {isMultiplayer ? "true" : "false"}</p>
            <p>isBountyCanceled: {isBountyCanceled ? "true" : "false"}</p>


        </div>


      </div>

      <div className='flex flex-col'>
      <div className="flex mt-5 lg:mt-0 gap-x-2 flex-row">
        <span>{bountyData ? weiToEther(bountyData.amount) : "Loading..."}</span>
        <span>eth</span>
      </div>
      {/* <div >{isMultiplayer? "this is multiplayer" : "no this is solo"}</div> */}
      <div className='' > {!isBountyClaimed && !isOwner ? <CreateProof bountyId={bountyId} /> : ""}</div>
     

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
