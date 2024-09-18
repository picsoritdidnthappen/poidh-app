// import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';

import { useDegenOrEnsName, useGetChain } from '@/hooks';
import { getURI } from '@/app/context';

interface ClaimItemProps {
  id: string;
  title: string;
  description: string;
  issuer: string;
  bountyId: string;
  youOwner: boolean;
  accepted: boolean;
  isAccepted?: boolean;
}

const ClaimItem: React.FC<ClaimItemProps> = ({
  id,
  title,
  description,
  issuer,
  bountyId,
  accepted,
}) => {
  const currentNetworkName = useGetChain();
  const [claimsURI, setClaimsURI] = useState('');
  const issuerDegenOrEnsName = useDegenOrEnsName(issuer);

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

  return (
    <div className='p-[2px] text-white relative bg-[#F15E5F] border-[#F15E5F] border-2 rounded-xl '>
      <Link href={`/bounty/${bountyId}`}>
        {accepted ? (
          <div className='right-5 top-5  text-white bg-[#F15E5F] border border-[#F15E5F] rounded-[8px] py-2 px-5 absolute '>
            accepted
          </div>
        ) : null}

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
            <p className=''>{description}</p>
          </div>

          <div className='mt-2 py-2 flex flex-row justify-between text-sm border-t border-dashed'>
            <span className=''>issuer</span>
            <Link
              href={`/${currentNetworkName}/account/${issuer}`}
              className='hover:text-gray-200'
            >
              {issuerDegenOrEnsName ||
                `$` + issuer.slice(0, 5) + '...' + issuer.slice(-6)}
            </Link>
          </div>
          <div>claim id: {id}</div>
        </div>
      </Link>
    </div>
  );
};

export default ClaimItem;
