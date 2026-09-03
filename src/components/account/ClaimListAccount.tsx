import Link from 'next/link';
import { ChainId, Claim } from '@/utils/types';
import DisplayAddress from '../global/DisplayAddress';
import CopyAddressButton from '../global/CopyAddressButton';
import SocialMediaLinks from '@/components/global/SocialMediaLinks';
import { getChainById } from '@/utils/config';
import MarkdownContent from '@/components/global/MarkdownContent';

function hashString(value: string) {
  let hash = 0;

  for (let i = 0; i < value.length; i++) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }

  return Math.abs(hash);
}

function GenerativePlaceholder({
  seed,
}: {
  seed: string;
}) {
  const hash = hashString(seed);

  const palette = [
    '#F45B5B',
    '#FFD166',
    '#118AB2',
    '#7B61FF',
    '#06D6A0',
    '#F4A261',
  ];

  const background =
    palette[hash % palette.length];

  const accent1 =
    palette[(hash + 2) % palette.length];

  const accent2 =
    palette[(hash + 4) % palette.length];

  const vertical =
    28 + ((hash >> 2) % 38);

  const horizontal =
    30 + ((hash >> 4) % 36);

  const smallBlockLeft =
    8 + ((hash >> 6) % 58);

  const smallBlockTop =
    8 + ((hash >> 8) % 58);

  return (
    <div
      className='absolute inset-0 overflow-hidden'
      style={{
        backgroundColor: background,
      }}
    >
      <div
        className='absolute top-0 bottom-0 w-[4px] bg-[#102A43]'
        style={{
          left: `${vertical}%`,
        }}
      />

      <div
        className='absolute left-0 right-0 h-[4px] bg-[#102A43]'
        style={{
          top: `${horizontal}%`,
        }}
      />

      <div
        className='absolute'
        style={{
          left: `${vertical}%`,
          top: 0,
          right: 0,
          height: `${horizontal}%`,
          backgroundColor: accent1,
        }}
      />

      <div
        className='absolute border-[4px] border-[#102A43]'
        style={{
          left: `${smallBlockLeft}%`,
          top: `${smallBlockTop}%`,
          width: '24%',
          height: '24%',
          backgroundColor: accent2,
        }}
      />
    </div>
  );
}

export default function ClaimsListAccount({
  claims,
}: {
  claims: Claim[];
}) {
  if (!claims || claims.length === 0) {
    return (
      <div className='text-center py-20 text-white/60'>
        no claims available
      </div>
    );
  }

  return (
    <div className='container mx-auto px-0 pb-12 pt-5 flex flex-col gap-12 lg:grid lg:grid-cols-12 lg:gap-12 lg:px-0'>
      {claims.map((claim) => (
        <div
          key={`${claim.chainId}-${claim.id}`}
          className='lg:col-span-4'
        >
          <ClaimItem claim={claim} />
        </div>
      ))}
    </div>
  );
}

function ClaimItem({
  claim,
}: {
  claim: Claim;
}) {
  const chain = getChainById({
    chainId: claim.chainId as ChainId,
  });

  const placeholderSeed =
    `${claim.chainId}-${claim.id}-${claim.issuer}`;

  return (
    <div className='p-[2px] text-white relative bg-poidhRed border-poidhRed border-2 rounded-xl'>
      <Link href={`/${chain.slug}/bounty/${claim.bountyId}`}>
        {claim.isAccepted && (
          <div className='right-5 top-5 z-10 text-white bg-poidhRed border border-poidhRed rounded-[8px] py-2 px-5 absolute'>
            accepted
          </div>
        )}

        <div className='relative bg-poidhBlue dark:bg-[#132b47] w-full aspect-square rounded-[8px] overflow-hidden'>
          {claim.url ? (
            <>
              <div
                style={{
                  backgroundImage: `url(${claim.url})`,
                }}
                className='absolute inset-0 bg-cover bg-center'
              />

              {/*
               * If the browser cannot render the supplied URL,
               * this layer is still underneath it as the fallback.
               */}
              <div className='absolute inset-0 -z-10'>
                <GenerativePlaceholder
                  seed={placeholderSeed}
                />
              </div>
            </>
          ) : (
            <GenerativePlaceholder
              seed={placeholderSeed}
            />
          )}
        </div>
      </Link>

      <div className='p-3'>
        <div className='flex flex-col'>
          <p className='normal-case text-nowrap overflow-ellipsis overflow-hidden'>
            {claim.title}
          </p>

          <p className='normal-case w-full h-20 overflow-y-auto overflow-x-hidden overflow-hidden'>
            <MarkdownContent>
              {claim.description}
            </MarkdownContent>
          </p>
        </div>

        <div className='mt-2 py-2 flex flex-row items-center text-sm border-t border-dashed'>
          <span className='shrink-0 mr-2'>
            issuer&nbsp;
          </span>

          <div className='flex flex-row items-center w-full justify-end overflow-hidden'>
            <DisplayAddress
              address={claim.issuer}
            />

            <div className='ml-2'>
              <CopyAddressButton
                address={claim.issuer}
              />
            </div>
          </div>
        </div>

        <div className='flex flex-row items-center justify-between'>
          <span>
            claim id: {claim.id}
          </span>

          <SocialMediaLinks
            address={claim.issuer}
          />
        </div>
      </div>
    </div>
  );
}
