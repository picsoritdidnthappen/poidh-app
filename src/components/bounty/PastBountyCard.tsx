import { useEffect, useState } from 'react';
import { ChainId, Claim } from '@/utils/types';
import { formatEther } from 'viem';
import { getChainById } from '@/utils/config';
import DisplayAddress from '../global/DisplayAddress';
import CopyAddressButton from '../global/CopyAddressButton';
import { formatAmount } from '@/utils/utils';
import SocialMediaLinks from '@/components/global/SocialMediaLinks';
import TextWithLinks from '@/components/global/TextWithLinks';
import { UsersRoundIcon } from '@/components/global/Icons';
import Link from 'next/link';
import { trpc } from '@/trpc/client';

export default function PastBountyCard({
  claim,
  bountyTitle,
  bountyAmount,
  isMultiplayer,
}: {
  claim: Claim;
  bountyTitle: string;
  bountyAmount: string;
  isMultiplayer: boolean;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const chain = getChainById({ chainId: claim.chainId as ChainId });

  const price =
    trpc.web3.fetchPrice.useQuery({ currency: chain.currency }).data ?? 0;

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
          href={`/${chain?.slug}/bounty/${claim.bountyId}`}
          className='lg:col-span-4 p-3 bg-whiteblue border-1 rounded-xl cursor-pointer'
        >
          <div className='p-[2px] text-white relative bg-poidhRed border-poidhRed border-2 rounded-xl'>
            <div>
              {claim.accepted && (
                <div className='left-5 top-5 text-white bg-poidhRed border border-poidhRed rounded-[8px] py-2 px-5 absolute'>
                  accepted
                </div>
              )}
              <div
                style={{ backgroundImage: `url(${imageUrl})` }}
                className='bg-poidhBlue bg-cover bg-center w-full aspect-w-1 aspect-h-1 rounded-[8px] overflow-hidden'
              ></div>
              <div className='p-3'>
                <div className='flex flex-col'>
                  <p className='normal-case text-nowrap overflow-ellipsis overflow-hidden break-word text-left'>
                    {claim.title}
                  </p>
                  <p className='normal-case w-full h-20 overflow-y-auto overflow-x-hidden overflow-hidden break-words text-left'>
                    <TextWithLinks>{claim.description}</TextWithLinks>
                  </p>
                </div>
                <div className='mt-2 py-2 flex flex-row items-center text-sm border-t border-dashed'>
                  <span className='shrink-0 mr-2'>issuer </span>
                  <div
                    className='flex flex-row items-center w-full justify-end overflow-hidden'
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DisplayAddress address={claim.issuer} />
                    <div className='ml-2'>
                      <CopyAddressButton address={claim.issuer} />
                    </div>
                  </div>
                </div>
                <div className='flex flex-row items-center justify-between'>
                  <span>claim id: {claim?.id}</span>
                  <SocialMediaLinks address={claim.issuer} />
                </div>
              </div>
            </div>
          </div>
          <div className='px-1 py-3 text-left'>
            <p className='text-nowrap overflow-ellipsis overflow-hidden text-xl mb-3 normal-case'>
              {bountyTitle}
            </p>
            <div className='flex items-center'>
              <span className='text-md mr-3'>
                {formatAmount({
                  amount: formatEther(BigInt(bountyAmount)),
                  currency: chain.currency,
                  price: price.toString(),
                })}
              </span>
              {isMultiplayer && <UsersRoundIcon size={20} />}
            </div>
          </div>
        </Link>
      )}
    </>
  );
}
