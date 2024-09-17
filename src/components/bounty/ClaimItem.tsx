import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { LiaCopySolid } from 'react-icons/lia';
import { toast } from 'react-toastify';

import { applyBreakAllToLongWords } from '@/lib/uiHelpers';
import { useDegenOrEnsName, useGetChain } from '@/hooks';
import { useBountyContext } from '@/components/bounty';
import { acceptClaim, getURI, submitClaimForVote } from '@/app/context';
import { ErrorInfo } from '@/types';

interface ClaimItemProps {
  id: string;
  title: string;
  description: string;
  issuer: string;
  bountyId: string;
  youOwner: boolean;
  accepted: boolean;
  isAccepted: boolean;
  openBounty: boolean | null;
}

const ClaimItem: React.FC<ClaimItemProps> = ({
  //openBounty,
  id,
  title,
  description,
  issuer,
  bountyId,
  accepted,
  //isAccepted,
}) => {
  const { primaryWallet } = useDynamicContext();
  const [claimsURI, setClaimsURI] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // const path = usePathname();
  //const [currentNetworkName, setCurrentNetworkName] = useState('');
  const currentNetworkName = useGetChain();
  const {
    isMultiplayer,
    isOwner,
    //bountyData,
    isBountyClaimed,
    isOwnerContributor,
  } = useBountyContext()!;
  const issuerDegenOrEnsName = useDegenOrEnsName(issuer);

  // useEffect(() => {
  //   const currentUrl = path.split('/')[1];
  //   setCurrentNetworkName(currentUrl || 'base');
  // }, []);

  useEffect(() => {
    if (id) {
      getURI(id)
        .then((data) => setClaimsURI(data))
        .catch(console.error);
    }
  }, [id]);

  const fetchImageUrl = async (uri: string) => {
    try {
      const response = await fetch(uri);
      const data = await response.json();
      console.log('@@@@@@@@@@ data:', data);
      setImageUrl(data.image);
    } catch (error) {
      console.error('Error fetching image:', error);
      setImageUrl(null);
    }
  };

  useEffect(() => {
    if (claimsURI) {
      console.log('@@@@@@@@@@ claimsURI:', claimsURI);
      fetchImageUrl(claimsURI);
    }
  }, [claimsURI]);

  const handleAcceptClaim = async () => {
    if (!id || !bountyId || !primaryWallet) {
      toast.error('Please check connection');
      return;
    }
    try {
      await acceptClaim(primaryWallet, bountyId, id);
      toast.success('Claim accepted!');
      window.location.reload();
    } catch (error: unknown) {
      console.error('Error accepting claim:', error);
      const errorCode = (error as ErrorInfo)?.info?.error?.code;
      if (errorCode === 4001) {
        toast.error('Transaction denied by user.');
      } else {
        toast.error('Failed to accept claim.');
      }
    }
  };

  const handleSubmitClaimForVote = async () => {
    if (!id || !bountyId || !primaryWallet) {
      toast.error('Please check connection');
      return;
    }
    try {
      await submitClaimForVote(primaryWallet, bountyId, id);
      toast.success('Claim submitted!');
    } catch (error: unknown) {
      console.error('Error submitting claim:', error);
      const errorCode = (error as ErrorInfo)?.info?.error?.code;
      if (errorCode === 4001) {
        toast.error('Transaction denied by user');
      } else {
        toast.error('Failed to submit claim');
      }
    }
  };

  const copyAddresstoClipboard = (address: string) => {
    try {
      navigator.clipboard.writeText(address);
      toast.success('Address copied to clipboard');
    } catch (error) {
      console.error('Error copying address to clipboard:', error);
      toast.error('Failed to copy address to clipboard');
    }
  };

  return (
    <div className='p-[2px] border text-white relative bg-[#F15E5F] border-[#F15E5F] border-2 rounded-xl '>
      <div className='left-5 top-5 absolute  flex flex-col text-white'>
        {isMultiplayer && isOwner && !isOwnerContributor ? (
          <button
            className=' submitForVote cursor-pointer text-[#F15E5F] hover:text-white hover:bg-[#F15E5F] border border-[#F15E5F] rounded-[8px] py-2 px-5  '
            onClick={handleSubmitClaimForVote}
          >
            submit for vote
          </button>
        ) : null}

        {isOwner && !isBountyClaimed && primaryWallet && isOwnerContributor ? (
          <div
            onClick={handleAcceptClaim}
            className=' acceptButton cursor-pointer mt-5 text-[#F15E5F] hover:text-white hover:bg-[#F15E5F] border border-[#F15E5F] rounded-[8px] py-2 px-5  '
          >
            accept
          </div>
        ) : null}
      </div>

      {accepted ? (
        <div className='left-5 top-5 text-white bg-[#F15E5F] border border-[#F15E5F] rounded-[8px] py-2 px-5 absolute '>
          accepted
        </div>
      ) : null}

      <div
        style={{ backgroundImage: `url(${imageUrl})` }}
        className='bg-[#12AAFF] bg-cover bg-center w-full aspect-w-1 aspect-h-1 rounded-[8px] overflow-hidden'
      ></div>
      <div className='p-3'>
        <div className='flex flex-col'>
          <p className='normal-case'>{title}</p>
          <p className='normal-case'>{applyBreakAllToLongWords(description)}</p>
        </div>
        <div className='mt-2 py-2 flex flex-row justify-between text-sm border-t border-dashed'>
          <span className=''>issuer</span>
          <span className='flex flex-row'>
            <Link
              href={`/${currentNetworkName}/account/${issuer}`}
              className='hover:text-gray-200'
            >
              {issuerDegenOrEnsName ||
                `$` + issuer.slice(0, 5) + '...' + issuer.slice(-6)}
            </Link>
            <span className='ml-1'>
              <button onClick={() => copyAddresstoClipboard(issuer)}>
                <LiaCopySolid color='white' size={20} />
              </button>
            </span>
          </span>
        </div>
        <div>claim id: {id}</div>
      </div>
    </div>
  );
};

export default ClaimItem;
