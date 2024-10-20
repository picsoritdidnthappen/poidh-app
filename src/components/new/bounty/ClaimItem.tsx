/* eslint-disable simple-import-sort/imports */
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

import { acceptClaim, submitClaimForVote } from '@/app/context';
import { useGetChain } from '@/hooks/new/useGetChain';
import { CopyIcon } from '@/components/new/global/Icons';

export default function ClaimItem({
  id,
  title,
  description,
  issuer,
  bountyId,
  accepted,
  isMultiplayer,
  url,
}: {
  id: string;
  title: string;
  description: string;
  issuer: string;
  bountyId: string;
  accepted: boolean;
  isMultiplayer: boolean;
  url: string;
}) {
  const { primaryWallet } = useDynamicContext();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const chain = useGetChain();

  const fetchImageUrl = async (url: string) => {
    const response = await fetch(url);
    const data = await response.json();
    setImageUrl(data.image);
  };

  useEffect(() => {
    fetchImageUrl(url);
  }, [url]);

  const handleAcceptClaim = async () => {
    if (!primaryWallet) {
      toast.error('Please connect your wallet');
      return;
    }
    try {
      await acceptClaim(primaryWallet, bountyId, id);
      toast.success('Claim accepted!');
      window.location.reload();
    } catch (error: any) {
      if (error.info?.error?.code !== 4001) {
        toast.error('Failed to accept claim.');
      }
    }
  };

  const handleSubmitClaimForVote = async () => {
    if (!primaryWallet) {
      toast.error('Please connect your wallet');
      return;
    }
    try {
      await submitClaimForVote(primaryWallet, bountyId, id);
      toast.success('Claim submitted!');
    } catch (error: any) {
      if (error.info?.error?.code !== 4001) {
        toast.error('Failed to submit claim.');
      }
    }
  };

  return (
    <div className='p-[2px] text-white relative bg-[#F15E5F] border-[#F15E5F] border-2 rounded-xl '>
      <div className='left-5 top-5 absolute  flex flex-col text-white'>
        {isMultiplayer && primaryWallet?.address === issuer && (
          <button
            className=' submitForVote cursor-pointer text-[#F15E5F] hover:text-white hover:bg-[#F15E5F] border border-[#F15E5F] rounded-[8px] py-2 px-5  '
            onClick={handleSubmitClaimForVote}
          >
            submit for vote
          </button>
        )}

        {primaryWallet?.address && primaryWallet && (
          <div
            onClick={handleAcceptClaim}
            className=' acceptButton cursor-pointer mt-5 text-[#F15E5F] hover:text-white hover:bg-[#F15E5F] border border-[#F15E5F] rounded-[8px] py-2 px-5  '
          >
            accept
          </div>
        )}
      </div>

      {accepted && (
        <div className='left-5 top-5 text-white bg-[#F15E5F] border border-[#F15E5F] rounded-[8px] py-2 px-5 absolute '>
          accepted
        </div>
      )}

      <div
        style={{ backgroundImage: `url(${imageUrl})` }}
        className='bg-[#12AAFF] bg-cover bg-center w-full aspect-w-1 aspect-h-1 rounded-[8px] overflow-hidden'
      ></div>
      <div className='p-3'>
        <div className='flex flex-col'>
          <p className='normal-case text-nowrap overflow-ellipsis overflow-hidden'>
            {title}
          </p>
          <p className='normal-case max-w-fit h-20 overflow-y-scroll overflow-x-hidden overflow-hidden'>
            {description}
          </p>
        </div>
        <div className='mt-2 py-2 flex flex-row justify-between text-sm border-t border-dashed'>
          <span className=''>issuer</span>
          <span className='flex flex-row'>
            <Link
              href={`/new/${chain.chainPathName}/account/${issuer}`}
              className='hover:text-gray-200'
            >
              {issuer.slice(0, 5) + '…' + issuer.slice(-6)}
            </Link>
            <span className='ml-1 text-white'>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(issuer);
                  toast.success('Address copied to clipboard');
                }}
              >
                <CopyIcon width={14} height={14} />
              </button>
            </span>
          </span>
        </div>
        <div>claim id: {id}</div>
      </div>
    </div>
  );
}
