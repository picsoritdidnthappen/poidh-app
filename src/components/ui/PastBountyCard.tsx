import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { CopyIcon } from '@/components/global/Icons';
import { chains } from '@/utils/config';
import { Claim } from '@/utils/types';
import { Chain } from '@/utils/types';
import { formatEther } from 'viem';
import DisplayAddress from '@/components/DisplayAddress';

const getChainById = (chainId: number): Chain => {
  const chain = Object.values(chains).find((chain) => chain.id === chainId);
  if (!chain) {
    throw new Error(`Chain with ID ${chainId} not found`);
  }
  return chain;
};

export default function PastBountyCard({
  claim,
  chainId,
  bountyTitle,
  bountyAmount,
}: {
  claim: Claim;
  chainId: number;
  bountyTitle: string;
  bountyAmount: string;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const chain = getChainById(chainId);

  const fetchImageUrl = async (url: string) => {
    const response = await fetch(url);
    const data = await response.json();
    setImageUrl(data.image);
  };

  useEffect(() => {
    fetchImageUrl(claim?.url);
  }, [claim]);

  return (
    <>
      {claim && (
        <Link
          className='lg:col-span-4 p-3 bg-whiteblue border-1 rounded-xl cursor-pointer'
          href={`/${chain?.slug}/bounty/${claim.bountyId}`}
        >
          <div className='p-[2px] text-white relative bg-[#F15E5F] border-[#F15E5F] border-2 rounded-xl'>
            <div>
              {claim.accepted && (
                <div className='left-5 top-5 text-white bg-[#F15E5F] border border-[#F15E5F] rounded-[8px] py-2 px-5 absolute'>
                  accepted
                </div>
              )}
              <div
                style={{ backgroundImage: `url(${imageUrl})` }}
                className='bg-[#12AAFF] bg-cover bg-center w-full aspect-w-1 aspect-h-1 rounded-[8px] overflow-hidden'
              ></div>
              <div className='p-3'>
                <div className='flex flex-col'>
                  <p className='normal-case text-nowrap overflow-ellipsis overflow-hidden break-word text-left'>
                    {claim.title}
                  </p>
                  <p className='normal-case w-full h-20 overflow-y-auto overflow-x-hidden overflow-hidden break-words text-left'>
                    {claim.description}
                  </p>
                </div>
                <div className='mt-2 py-2 flex flex-row justify-between text-sm border-t border-dashed'>
                  <span className=''>issuer</span>
                  <span className='flex flex-row'>
                    <div
                      className='hover:text-gray-200'
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <DisplayAddress address={claim.issuer} chain={chain} />
                    </div>
                    <span className='ml-1 text-white'>
                      <button
                        onClick={async () => {
                          await navigator.clipboard.writeText(claim?.issuer);
                          toast.success('Address copied to clipboard');
                        }}
                      >
                        <CopyIcon width={16} height={16} />
                      </button>
                    </span>
                  </span>
                </div>
                <div className='text-left'>claim id: {claim?.id}</div>
              </div>
            </div>
          </div>
          <div className='px-1 py-3 text-left'>
            <p className='text-nowrap overflow-ellipsis overflow-hidden text-xl mb-3 normal-case'>
              {bountyTitle}
            </p>
            <span className='text-md'>
              {formatEther(BigInt(bountyAmount))} {chain?.currency}
            </span>
          </div>
        </Link>
      )}
    </>
  );
}
