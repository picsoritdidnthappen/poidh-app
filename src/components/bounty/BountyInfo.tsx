import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useEffect, useState } from 'react';
import { fetchBountyById, getParticipants } from '@/app/context/web3';
import CreateProof from '@/components/ui/CreateProof';
import JoinBounty from '@/components/ui/JoinBounty';
import {OpenBounty, Bounty} from '../../types/web3';
import BountyMultiplayer from '@/components/bounty/BountyMultiplayer';



function weiToEther(weiValue: string | number): string {
  const etherValue = Number(weiValue) / 1e18;
  return etherValue.toFixed(6); 
}

const BountyInfo = ({ bountyId }: { bountyId: string }) => {
  const [bountyData, setBountyData] = useState<Bounty | null>(null);
  const [youOwner, setYouOwner] = useState<boolean | null>(null); 
  const [bountyClaimed, setBountyClaimed] = useState<boolean | null>(null); 
  const [ openBounty, setOpenBounty] = useState <boolean | null>(null)

  const { user } = useDynamicContext(); 
  const currentUser = user?.verifiedCredentials[0].address;
  

  useEffect(() => {
    setYouOwner(null); 
    if (bountyId) {
      getParticipants(bountyId)
      .then((openBounty: OpenBounty) => { 
        setOpenBounty(openBounty.addresses.length === 0 ? false : true);
      })
      .catch(console.error);       
      fetchBountyById(bountyId)
        .then(data => {
          setBountyData(data);
          setYouOwner(currentUser === data.issuer)
          setBountyClaimed(data.claimer === "0x0000000000000000000000000000000000000000")
        })
        .catch(console.error);
    }
  }, [ bountyId]);

  

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
      <div>{openBounty? "this is multiplayer" : "no this is solo"}</div>
      <div> {bountyClaimed && !youOwner ? <CreateProof bountyId={bountyId} /> : ""}</div>
     

      </div>

      

    </div>

    {openBounty ? 
    <div>

      <BountyMultiplayer bountyId={bountyId} />
    
    </div> : null}


   
    </>
  );
};

export default BountyInfo;
