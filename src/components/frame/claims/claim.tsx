import { BountyResponse } from '@/app/api/bounties/[chainName]/[bountyId]/route';
import React from 'react';

interface ClaimShowcaseProps {
  claim: BountyResponse['bounty']['claims'][0];
  url: string;
}

const ClaimShowcase: React.FC<ClaimShowcaseProps> = ({ claim, url }) => {
  return (
    <div
      tw='w-full h-full p-6 flex flex-col gap-4 relative'
      style={{
        background:
          'linear-gradient(to bottom, #2a81d5, #70aae2, #6fa9e1, #2a81d5)',
        gap: '16px',
      }}
    >
      {/* POIDH Text */}
      <div tw='w-full text-center flex items-center justify-center'>
        <span tw='text-red-500 font-bold text-xl'>poidh</span>
      </div>

      <div tw='flex justify-between items-start w-full '>
        {/* Claim Content */}
        <div
          style={{ gap: '6px', maxWidth: '50%' }}
          tw='flex flex-col gap-3 items-start justify-start text-white'
        >
          <h3
            tw='text-xl font-bold max-w-[80%] overflow-hidden underline'
            style={{ whiteSpace: 'break-spaces' }}
          >
            "{claim.title}"
          </h3>
          <p
            tw='text-sm font-semibold'
            style={{
              margin: '0',
              maxWidth: '100%',
              whiteSpace: 'nowrap',
            }}
          >
            {claim.description.length > 35
              ? claim.description.slice(0, 35) + '...'
              : claim.description}
          </p>
          <span tw='text-sm bg-green-500 px-2 py-1 rounded-full'>
            {claim.is_accepted ? 'Accepted' : 'Pending'}
          </span>

          <div tw='flex flex-col gap-2 items-start justify-start text-xs'>
            <div tw='flex items-center justify-center'>
              Issuer:{' '}
              {claim.issuer.address?.slice(0, 4) +
                '...' +
                claim.issuer.address?.slice(-4)}
            </div>
            <div tw=' flex items-center justify-center'>
              Owner: {claim.owner?.slice(0, 4) + '...' + claim.owner?.slice(-4)}
            </div>
          </div>

          {claim.url && (
            <div tw='text-sm mt-2 text-blue-200 flex items-center justify-center'>
              Proof submitted
            </div>
          )}
        </div>
        {url && (
          <img
            src={url}
            tw=' rounded-lg'
            style={{ objectFit: 'cover', width: '30%', aspectRatio: '1:1' }}
            width={200}
            height={200}
            alt=''
          />
        )}
      </div>
    </div>
  );
};

export default ClaimShowcase;
