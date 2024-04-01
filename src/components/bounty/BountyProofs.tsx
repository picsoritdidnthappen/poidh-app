import ProofList from '@/components/bounty/ProofList';
import React, { useEffect, useState } from 'react';

import {  getClaimsByBountyId, getNFTContractRead, getURI} from '@/app/context/web3';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import NoProof from '@/components/bounty/NoProof';



interface Claim {
  id: any;
  issuer: any;
  name: any;
  description: any;
  value: any;
  claimer: any;
  createdAt: any;
  claimId: any;
  bountyId: any;
  accepted: boolean

}

const BountyProofs = ({ bountyId }: { bountyId: string }) => {
  const [claimsData, setClaimsData] = useState<Claim[] | null>(null);
  const [youOwner, setYouOwner] = useState<boolean | null>(null); 
  const { primaryWallet } = useDynamicContext(); 

  useEffect(() => {
    setYouOwner(null); 
    if (bountyId) {
      getClaimsByBountyId(bountyId)
      .then(data => setClaimsData(data))
      .catch(console.error);
    }
   
  }, [ bountyId]);



  return (
    <div>
      <div className='flex flex-row gap-x-2 py-4 border-b border-dashed'>
      <span>({claimsData ? claimsData.length : 0})</span>
      <span>proofs</span>
      </div>
      {claimsData && claimsData.length > 0 ? <ProofList youOwner={youOwner}  data={claimsData} /> : <NoProof bountyId={bountyId}/>}



    </div>
  );
};

export default BountyProofs;