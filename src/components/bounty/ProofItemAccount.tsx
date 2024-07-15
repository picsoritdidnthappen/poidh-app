import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';

import { useDegenOrEnsName } from '@/hooks/useDegenOrEnsName';

import { acceptClaim, getURI, submitClaimForVote } from '@/app/context/web3';
import { applyBreakAllToLongWords } from '@/lib/uiHelpers';

interface ProofItemProps {
  id: string;
  title: string;
  description: string;
  issuer: string;
  bountyId: string;
  youOwner: boolean;
  accepted: boolean;
  isAccepted: boolean;
  // openBounty: boolean | null;
}

const ProofItem: React.FC<ProofItemProps> = ({
  id,
  title,
  description,
  issuer,
  bountyId,
  accepted,
  isAccepted,
}) => {
  const { user, primaryWallet } = useDynamicContext();
  const [claimsURI, setClaimsURI] = useState('');
  const issuerDegenOrEnsName = useDegenOrEnsName(issuer);
  const [isExpanded, setIsExpanded] = useState(false);
  // const { isMultiplayer, isOwner, bountyData, isBountyClaimed} = useBountyContext()!;

  // const currentUser = user?.verifiedCredentials[0].address;

  // const notOwner = currentUser === issuer ;

  useEffect(() => {
    if (id) {
      getURI(id)
        .then(async (uri) => {
          const response = await fetch(uri);
          const data = await response.json();
          setClaimsURI(data.image);
        })
        .catch(console.error);
    }
  }, [id]);

  const handleAcceptClaim = async () => {
    if (!id || !bountyId || !primaryWallet) {
      alert('Please check connection');
      return;
    }

    try {
      await acceptClaim(primaryWallet, bountyId, id);
    } catch (error) {
      console.error('Error accepting claim:', error);
      alert('Failed to accept claim.');
    }
  };

  const handleSubmitClaimForVote = async () => {
    if (!id || !bountyId || !primaryWallet) {
      alert('Please check connection');
      return;
    }

    try {
      await submitClaimForVote(primaryWallet, bountyId, id);
    } catch (error) {
      console.error('Error accepting claim:', error);
      alert('Failed to accept claim.');
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className='p-[2px] border text-white relative bg-[#F15E5F] border-[#F15E5F] border-2 rounded-xl h-[600px] overflow-scroll'>
      <Link href={`/bounty/${bountyId}`}>
        {/* <div className='left-5 top-5 absolute text-white'>{isMultiplayer && isOwner ? 
       <button onClick={handleSubmitClaimForVote} >submit for vote</button>
       : null}</div> */}
        {accepted ? (
          <div className='right-5 top-5  text-white bg-[#F15E5F] border border-[#F15E5F] rounded-[8px] py-2 px-5 absolute '>
            accepted
          </div>
        ) : null}
        {/* 
        {  isOwner && !isBountyClaimed && primaryWallet ? 
        <div onClick={handleAcceptClaim} className="right-5 top-5 cursor-pointer text-[#F15E5F] hover:text-white hover:bg-[#F15E5F] border border-[#F15E5F] rounded-[8px] py-2 px-5 absolute ">
        accept
        </div> :
        null
        } */}

        <div className='bg-[#12AAFF] w-full aspect-w-1 aspect-h-1 rounded-[8px] overflow-hidden'>
          {claimsURI && (
            <div
              style={{ backgroundImage: `url(${claimsURI})` }}
              className='bg-[#12AAFF] bg-cover bg-center w-full aspect-w-1 aspect-h-1 rounded-[8px] overflow-hidden'
            ></div>
          )}
        </div>

        <div className='p-3'>
          <div className='flex flex-col'>
            <p className=''>{title}</p>
            <div className='flex items-end'>
              <p
                className={`normal-case ${
                  isExpanded ? '' : 'line-clamp-3 flex-grow'
                }`}
              >
                {applyBreakAllToLongWords(description)}
              </p>
              {description.split(' ').length > 15 && (
                <button onClick={toggleExpand} className='text-gray-200 mt-2'>
                  {isExpanded ? '▲' : '▼'}
                </button>
              )}
            </div>
          </div>

          <div className='mt-2 py-2 flex flex-row justify-between text-sm border-t border-dashed'>
            <span className=''>issuer</span>
            <span>
              {issuerDegenOrEnsName ||
                `$` + issuer.slice(0, 5) + '...' + issuer.slice(-6)}
            </span>
          </div>
          <div>claim id: {id}</div>
        </div>
      </Link>
    </div>
  );
};

export default ProofItem;
