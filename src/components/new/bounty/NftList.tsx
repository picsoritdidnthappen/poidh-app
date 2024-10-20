import React, { useEffect, useState } from 'react';

type NFT = {
  id: string;
  title: string;
  description: string;
  url: string;
};

export default function NftList({ NFTs }: { NFTs: NFT[] }) {
  if (NFTs.length === 0) {
    return <div className='text-center py-20'>no NFT details available.</div>;
  }

  return (
    <div className='md:grid flex flex-col md:grid-cols-8 lg:grid-cols-12 my-20 gap-12'>
      {NFTs.map((NFT, index) => (
        <NftListItem NFT={NFT} key={index} />
      ))}
    </div>
  );
}

function NftListItem({ NFT }: { NFT: NFT }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const fetchImageUrl = async (url: string) => {
    const response = await fetch(url);
    const data = await response.json();
    setImageUrl(data.image);
  };

  useEffect(() => {
    fetchImageUrl(NFT.url);
  }, [NFT]);

  return (
    <div className=' md:col-span-4 '>
      <div className='p-[2px] text-white relative bg-[#F15E5F] border-[#F15E5F] border-2 rounded-xl '>
        <div
          style={{ backgroundImage: `url(${imageUrl})` }}
          className='bg-[#12AAFF] bg-cover bg-center w-full aspect-w-1 aspect-h-1 rounded-[8px] overflow-hidden'
        ></div>
        <div className='p-3'>
          <div className='flex break-words flex-col'>
            <p>{NFT.title}</p>
            <p>{NFT.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
