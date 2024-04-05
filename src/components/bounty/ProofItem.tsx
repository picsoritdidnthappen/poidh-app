
import React, { useEffect, useState } from 'react';
import { getURI, acceptClaim, submitClaimForVote} from '@/app/context/web3';
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";


interface ProofItemProps {
  id: string;
  title: string;
  description: string;
  issuer: string;
  bountyId:string;
  youOwner:boolean;
  accepted:boolean;
  isAccepted:boolean
  openBounty: boolean | null;
}

const ProofItem: React.FC<ProofItemProps> = ({ openBounty, id, title, description, issuer , bountyId, accepted, isAccepted}) => {

  const { user, primaryWallet } = useDynamicContext(); 
  const [claimsURI, setClaimsURI] = useState("")
  const currentUser = user?.verifiedCredentials[0].address;

  const notOwner = currentUser === issuer ;


  useEffect(() => {
    if (id) {
      getURI(id)
      .then(data => setClaimsURI(data))
      .catch(console.error);
    }
   
  }, [id]);

  const handleAcceptClaim = async () => {
    if (!id || !bountyId || !primaryWallet ) {
      alert("Please check connection");
      return;
    }

    try {
     await acceptClaim(primaryWallet,  bountyId, id)

    } catch (error) {
      console.error('Error accepting claim:', error);
      alert("Failed to accept claim.");
    }
  };

  const handleSubmitClaimForVote = async () => {
    if (!id || !bountyId || !primaryWallet ) {
      alert("Please check connection");
      return;
    }

    try {
     await submitClaimForVote(primaryWallet,  bountyId, id)

    } catch (error) {
      console.error('Error accepting claim:', error);
      alert("Failed to accept claim.");
    }
  };


  

  return (
    <div className='p-[2px] border text-white relative bg-[#F15E5F] border-[#F15E5F] border-2 rounded-xl ' >
       <div className='left-5 top-5 absolute text-white'>{openBounty && !notOwner ? 
       <button onClick={handleSubmitClaimForVote} > submit for vote</button>
       : null}</div>
        { accepted  ?
        <div className="right-5 top-5  text-white bg-[#F15E5F] border border-[#F15E5F] rounded-[8px] py-2 px-5 absolute ">
        accepted
        </div> 
         :
        null 
        } 

        { !accepted && !notOwner && !isAccepted && primaryWallet ? 
        <div onClick={handleAcceptClaim} className="right-5 top-5 cursor-pointer text-[#F15E5F] hover:text-white hover:bg-[#F15E5F] border border-[#F15E5F] rounded-[8px] py-2 px-5 absolute ">
        accept
        </div> :
        null
        }

      <div className="bg-[#12AAFF] w-full h-[40vh] rounded-[8px]">

        { claimsURI ? 
        <img className="w-full h-full rounded-[8px] object-cover" src={claimsURI} alt="claim image" />
         : null
        }

      </div>
      <div className="p-3">
      <div className="flex flex-col">
      <p className="">{title}</p>
      <p className="" >{description}</p>
      </div>
      <div className="mt-2 py-2 flex flex-row justify-between text-sm border-t border-dashed">
        <div>claim id: {id}</div>
        <span className="">
          issuer
        </span>
        <span>
        ${issuer.slice(0, 5)}...{issuer.slice(-6)}
        </span>
      </div>
      </div>
    </div>
  );
};

export default ProofItem;
