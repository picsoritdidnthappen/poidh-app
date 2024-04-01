// ProofList.tsx
import ProofItem from '@/components/bounty/ProofItem';
import React, { useEffect, useState } from 'react';


interface Claim {
  id: string;
  issuer: string;
  name: string;
  description: string;
  value: string;
  claimer: string;
  createdAt: string;
  claimId: string;
  bountyId: string
  accepted: boolean
}

interface ProofListProps {
  data: Claim[]; 
  youOwner: any;
}

const ProofList: React.FC<ProofListProps> = ({ data, youOwner }) => {
  const [isAccepted, setIsAccepted] = useState(true);

  useEffect(() => {
    const checkAccepted = data.some(claim => claim.accepted === true);
    setIsAccepted(checkAccepted);
  }, [data]);



  return (
    <div className='container mx-auto px-5 py-12 flex flex-col gap-12 lg:grid lg:grid-cols-12 lg:gap-12 lg:px-0 '>
      {data.map((claim) => (
        <ProofItem isAccepted={isAccepted} youOwner={youOwner} bountyId={claim.bountyId} key={claim.id} id={claim.id} title={claim.name} description={claim.description} issuer={claim.issuer} accepted={claim.accepted} />
      ))}
    </div>
  );
};

export default ProofList;
