import React from 'react';

interface NFTDetail {
  uri: string;
  name: string;
  description: string;
  nftId: string;
}

interface NftListProps {
  nftDetails: NFTDetail[] | null;  // Allow nftDetails to be null
}

const NftList: React.FC<NftListProps> = ({ nftDetails }) => {
  if (nftDetails === null) {
    return <div className='text-center py-20'>no NFT details available.</div>;  // Handling the case where nftDetails is null
  }

  return (
    <div className='md:grid flex flex-col md:grid-cols-8 lg:grid-cols-12 my-20 gap-12'>
      {nftDetails.map((detail, index) => (
        <div className=' md:col-span-4 ' key={index}>
             <div className='p-[2px] border text-white relative bg-[#F15E5F] border-[#F15E5F] border-2 rounded-xl '>

        <div style={{backgroundImage: `url(${detail.uri})`}} className="bg-[#12AAFF] bg-cover bg-center w-full aspect-w-1 aspect-h-1 rounded-[8px] overflow-hidden">
  
</div>
<div className="p-3">
  <div className="flex break-words flex-col">
  <p>{detail.name}</p>
  <p className="">{detail.description}</p>
  </div>
 
</div>
</div> 

         
        </div>
      ))}
    </div>
  );
};

export default NftList;
