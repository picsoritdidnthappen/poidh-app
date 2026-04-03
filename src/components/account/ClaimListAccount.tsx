import Link from 'next/link';
import { ChainId, Claim } from '@/utils/types';
import DisplayAddress from '../global/DisplayAddress';
import CopyAddressButton from '../global/CopyAddressButton';
import SocialMediaLinks from '@/components/global/SocialMediaLinks';
import TextWithLinks from '@/components/global/TextWithLinks';
import { getChainById } from '@/utils/config';

export default function ClaimsListAccount({ claims }: { claims: Claim[] }) {
  if (!claims || claims.length === 0) {
    return (
      <div className='text-center py-20 text-white/60'>no claims available</div>
    );
  }

  return (
    <div className='container mx-auto px-0  pb-12 pt-5 flex flex-col gap-12 lg:grid lg:grid-cols-12 lg:gap-12 lg:px-0 '>
      {claims.map((claim) => (
        <div key={claim.id} className={` lg:col-span-4`}>
          <ClaimItem claim={claim} />
        </div>
      ))}
    </div>
  );
}

function ClaimItem({ claim }: { claim: Claim }) {
  const chain = getChainById({ chainId: claim.chainId as ChainId });

  return (
    <div className='p-[2px] text-white relative bg-poidhRed border-poidhRed border-2 rounded-xl '>
      <Link href={`/${chain.slug}/bounty/${claim.bountyId}`}>
        {claim.isAccepted && (
          <div className='right-5 top-5  text-white bg-poidhRed border border-poidhRed rounded-[8px] py-2 px-5 absolute'>
            accepted
          </div>
        )}

        <div className='bg-poidhBlue dark:bg-[#132b47] w-full aspect-w-1 aspect-h-1 rounded-[8px] overflow-hidden'>
          <div
            style={{ backgroundImage: `url(${claim.url})` }}
            className='bg-poidhBlue dark:bg-[#132b47] bg-cover bg-center w-full aspect-w-1 aspect-h-1 rounded-[8px] overflow-hidden'
          ></div>
        </div>
      </Link>
      <div className='p-3'>
        <div className='flex flex-col'>
          <p className='normal-case text-nowrap overflow-ellipsis overflow-hidden'>
            {claim.title}
          </p>
          <p className='normal-case w-full h-20 overflow-y-auto overflow-x-hidden overflow-hidden'>
            <TextWithLinks>{claim.description}</TextWithLinks>
          </p>
        </div>
        <div className='mt-2 py-2 flex flex-row items-center text-sm border-t border-dashed'>
          <span className='shrink-0 mr-2'>issuer&nbsp;</span>
          <div className='flex flex-row  items-center w-full justify-end overflow-hidden'>
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
  );
}
