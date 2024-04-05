import ProofList from '@/components/bounty/ProofList';
import React, { useEffect, useState } from 'react';
import {  bountyCurrentVotingClaim, getClaimsByBountyId, getParticipants} from '@/app/context/web3';
import NoProof from '@/components/bounty/NoProof';
import { OpenBounty, Claim } from '@/types/web3';
import Voting from '@/components/bounty/Voting';




const BountyProofs = ({ bountyId }: { bountyId: string }) => {
  const [claimsData, setClaimsData] = useState<Claim[] | null>(null);
  const [youOwner, setYouOwner] = useState<boolean | null>(null); 
  const [currentVotingClaim, setCurrentVotingClaim] = useState<number | null>(null); 


  const [ openBounty, setOpenBounty] = useState <boolean | null>(null)

  useEffect(() => {
    setYouOwner(null); 
    if (bountyId) {
      getParticipants(bountyId)
      .then((openBounty) => { 
        setOpenBounty(openBounty.addresses.length === 0 ? false : true);
      })
      .catch(console.error);  
      getClaimsByBountyId(bountyId)
      .then(data => setClaimsData(data))
      .catch(console.error);
  
      (async () => {
        const currentVotingClaim = await bountyCurrentVotingClaim(bountyId);
        setCurrentVotingClaim(currentVotingClaim);
      })();
    }
  }, [bountyId]);
  

  return (
    <div>
      <div className='flex flex-col gap-x-2 py-4 border-b border-dashed'>
      <div>Currently voting on: {currentVotingClaim === 0 ? "no claim for vote selected" : currentVotingClaim}</div>
      <div>
      <span>({claimsData ? claimsData.length : 0})</span>
      <span>proofs</span></div>
      </div>
      {claimsData && claimsData.length > 0 ? 
      <ProofList  currentVotingClaim={currentVotingClaim}  openBounty={openBounty} youOwner={youOwner}  data={claimsData} /> 
      : <NoProof bountyId={bountyId}/>
      } 
      <div>
        {currentVotingClaim !== 0 ? 
        <Voting  bountyId={bountyId} /> : null}
      </div>




    </div>
  );
};

export default BountyProofs;