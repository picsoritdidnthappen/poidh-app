import { cancelOpenBounty, cancelSoloBounty } from '@/app/context/web3';
import BountyMultiplayer from '@/components/bounty/BountyMultiplayer';
import { useBountyContext } from '@/components/bounty/BountyProvider';
import CreateProof from '@/components/ui/CreateProof';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';



function weiToEther(weiValue: string | number | bigint): string {
  const etherValue = Number(weiValue) / 1e18;
  return etherValue.toFixed(6); 
}

const BountyInfo = ({ bountyId }: { bountyId: string }) => {
  const { primaryWallet } = useDynamicContext();

  
  const { isMultiplayer, isOwner, bountyData, isBountyClaimed, isBountyCanceled, isOwnerContributor, } = useBountyContext()!;


  console.log("Is multiplayer:", isMultiplayer)
  console.log("Is Owner:", isOwner)
  console.log("Is Claimed:", isBountyClaimed)

  const handleCancelBounty = async () => {
    if (primaryWallet) {
      try {
        await cancelSoloBounty(primaryWallet, bountyId);
        alert('Bounty canceled successfully!');
      } catch (error) {
        console.error('Error canceling bounty:', error);
        alert('Failed to cancel bounty.');
      }
    } else {
      alert('Please connect your wallet first.');
    }
  };



  const handleCancelOpenBounty = async () => {
    if (  !primaryWallet ) {
      alert("Please fill in all fields and connect wallet");
      return;
    }
    try {
      await cancelOpenBounty(primaryWallet, bountyId);
      alert("Bounty canceled successfully!");
    } catch (error) {
      console.error('Error canceling:', error);
      alert("Failed to cancel.");
    }
  };

  const handleCancel = () => {
    if (!isMultiplayer) {
      handleCancelBounty();
    } else {
      handleCancelOpenBounty();
    }
  };
  
  

  

  return (
    <>
    <div className="flex pt-20 flex-col  justify-between lg:flex-row">
      <div className="flex flex-col  lg:max-w-[50%]">
        <p className=" text-2xl lg:text-4xl text-bold">{bountyData?.name}</p>
        <p className="mt-5">{bountyData?.description}</p>
        <p>Bounty issuer: {bountyData?.issuer}</p>


       




        {/* <div>
            <p>Debug:</p>

            <p>is Owner: {isOwner ? "true" : "false"}</p>
            <p>isBountyClaimed: {isBountyClaimed ? "true" : "false"}</p>
            <p>isMultiplayer: {isMultiplayer ? "true" : "false"}</p>
            <p>isBountyCanceled: {isBountyCanceled ? "true" : "false"}</p>
            <p>isOwnerContributor: {isOwnerContributor ? "true" : "false"}</p>

            



        </div> */}


      </div>

      <div className='flex flex-col space-between'>
  <div className="flex mt-5 lg:mt-0 gap-x-2 flex-row">
    <span>{bountyData ? weiToEther(bountyData.amount) : "Loading..."}</span>
    <span>degen</span>
  </div>

  <div>
    {!isBountyClaimed && !isOwner ? (
      <CreateProof bountyId={bountyId} />
    ) : (
      <button 
        onClick={handleCancel}
        disabled={!!isBountyClaimed}
        className={`border border-[#F15E5F]  rounded-md py-2 px-5 mt-5 ${isBountyClaimed ? "bg-[#F15E5F] text-white " : "text-[#F15E5F]"} `}  
      >
    {bountyData?.claimer === bountyData?.issuer ? "canceled" : (bountyData?.claimer !== bountyData?.issuer && bountyData?.claimer !== "0x0000000000000000000000000000000000000000" ? "accepted" : (bountyData?.claimer === "0x0000000000000000000000000000000000000000" ? "cancel" : null))}


      </button>
    )}
  </div>
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
