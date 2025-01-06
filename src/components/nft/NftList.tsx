import CopyAddressButton from '@/components/ui/CopyAddressButton';
import DisplayAddress from '@/components/ui/DisplayAddress';
import { useGetChain } from '@/hooks/useGetChain';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';

type NFT = {
  id: string;
  title: string;
  description: string;
  url: string;
  bountyId: string;
  issuer: string;
};

export default function NftList({ NFTs }: { NFTs: NFT[] }) {
  if (NFTs.length === 0) {
    return <div className='text-center py-20'>no NFT details available.</div>;
  }

  return (
    <div className='container mx-auto px-0  py-12 flex flex-col gap-12 lg:grid lg:grid-cols-12 lg:gap-12 lg:px-0'>
      {NFTs.map((NFT, index) => (
        <div className='lg:col-span-4' key={index}>
          <NftListItem NFT={NFT} />
        </div>
      ))}
    </div>
  );
}

function NftListItem({ NFT }: { NFT: NFT }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const chain = useGetChain();

  const fetchImageUrl = async (url: string) => {
    const response = await fetch(url);
    const data = await response.json();
    setImageUrl(data.image);
  };

  useEffect(() => {
    fetchImageUrl(NFT.url);
  }, [NFT]);

  return (
    <div className='p-[2px] text-white relative bg-poidhRed border-poidhRed border-2 rounded-xl w-full'>
      <Link href={`/${chain.slug}/bounty/${NFT.bountyId}`}>
        <div className='bg-poidhBlue aspect-w-1 aspect-h-1 rounded-[8px] overflow-hidden'>
          <div
            style={{ backgroundImage: `url(${imageUrl})` }}
            className='bg-poidhBlue bg-cover bg-center aspect-w-1 aspect-h-1 rounded-[8px] overflow-hidden'
          />
        </div>
      </Link>
      <div className='p-3'>
        <div className='flex flex-col'>
          <p className='normal-case text-nowrap overflow-ellipsis overflow-hidden'>
            {NFT.title}
          </p>
          <p className='normal-case w-full h-20 overflow-y-auto overflow-x-hidden overflow-hidden'>
            {NFT.description}
          </p>
        </div>
        <div className='mt-2 py-2 flex flex-row justify-between text-sm border-t border-dashed'>
          <span className=''>issuer&nbsp;</span>
          <div className='flex flex-row  items-center w-full justify-end overflow-hidden'>
            <DisplayAddress chain={chain} address={NFT.issuer} />
            <div className='ml-2'>
              <CopyAddressButton address={NFT.issuer} />
            </div>
          </div>
        </div>
        <div>claim id: {NFT.id}</div>
      </div>
    </div>
  );
}
