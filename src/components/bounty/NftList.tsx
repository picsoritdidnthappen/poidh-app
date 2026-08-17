import Link from 'next/link';
import DisplayAddress from '../global/DisplayAddress';
import CopyAddressButton from '../global/CopyAddressButton';
import SocialMediaLinks from '@/components/global/SocialMediaLinks';
import { getChainById } from '@/utils/config';
import { ChainId } from '@/utils/types';
import MarkdownContent from '@/components/global/MarkdownContent';

type NFT = {
  id: number;
  chainId: ChainId;
  title: string;
  description: string;
  url: string | null;
  bountyId: number;
  issuer: string;
};

export default function NftList({ NFTs }: { NFTs: NFT[] }) {
  if (NFTs.length === 0) {
    return (
      <div className='text-center py-20 text-white/60'>no NFTs available</div>
    );
  }

  return (
    <div className='container mx-auto px-0  pt-5 pb-12 flex flex-col gap-12 lg:grid lg:grid-cols-12 lg:gap-12 lg:px-0'>
      {NFTs.map((NFT, index) => (
        <div className='lg:col-span-4' key={index}>
          <NftListItem NFT={NFT} />
        </div>
      ))}
    </div>
  );
}

function NftListItem({ NFT }: { NFT: NFT }) {
  const chain = getChainById({ chainId: NFT.chainId });

  return (
    <div className='p-[2px] text-white relative bg-poidhRed border-poidhRed border-2 rounded-xl w-full'>
      <Link href={`/${chain.slug}/bounty/${NFT.bountyId}`}>
        <div className='bg-poidhBlue dark:bg-[#132b47] aspect-w-1 aspect-h-1 rounded-[8px] overflow-hidden'>
          <div
            style={{ backgroundImage: `url(${NFT.url})` }}
            className='bg-poidhBlue dark:bg-[#132b47] bg-cover bg-center aspect-w-1 aspect-h-1 rounded-[8px] overflow-hidden'
          />
        </div>
      </Link>
      <div className='p-3'>
        <div className='flex flex-col'>
          <p className='normal-case text-nowrap overflow-ellipsis overflow-hidden'>
            {NFT.title}
          </p>
          <p className='normal-case w-full h-20 overflow-y-auto overflow-x-hidden overflow-hidden'>
            <MarkdownContent>{NFT.description}</MarkdownContent>
          </p>
        </div>
        <div className='mt-2 py-2 flex flex-row justify-between text-sm border-t border-dashed'>
          <span className=''>issuer&nbsp;</span>
          <div className='flex flex-row  items-center w-full justify-end overflow-hidden'>
            <DisplayAddress address={NFT.issuer} />
            <div className='ml-2'>
              <CopyAddressButton address={NFT.issuer} />
            </div>
          </div>
        </div>
        <div className='flex flex-row items-center justify-between'>
          <span>claim id: {NFT.id}</span>
          <SocialMediaLinks address={NFT.issuer} />
        </div>
      </div>
    </div>
  );
}
