import { formatAmount } from '@/utils/utils';
import { formatEther } from 'viem';
import { ChainId } from '@/utils/types';
import { getChainById } from '@/utils/config';
import DynamicChainIcon from '@/components/global/DynamicChainIcon';

export type BountyPreviewData = {
  title: string;
  amount: string;
  chainId: ChainId;
  currencyRate: number;
  participants: string[];
};

export type FarcasterUser = {
  username: string;
  pfp_url: string;
};

async function resolveWeiOrEnsOrDegenNames(
  addresses: string[]
): Promise<{ [address: string]: string }> {
  const results: { [address: string]: string } = {};
  const resolved = await Promise.allSettled(
    addresses.map(async (addr) => {
      const res = await fetch(
        `${
          process.env.NEXT_PUBLIC_APP_URL
        }/api/trpc/web3.fetchWeiOrEnsOrDegenName?input=${encodeURIComponent(
          JSON.stringify({ json: { address: addr } })
        )}`
      );
      const json = await res.json();
      const name = (json?.result?.data?.json ?? json?.result?.data) as
        | string
        | null;
      return { addr, name };
    })
  );
  for (const result of resolved) {
    if (result.status === 'fulfilled' && result.value.name) {
      results[result.value.addr] = result.value.name;
    }
  }
  return results;
}

export default async function BountyPreviewCard({
  bountyData,
  farcasterParticipants,
  imageFormat = 'og',
}: {
  bountyData: BountyPreviewData;
  farcasterParticipants: { [address: string]: FarcasterUser[] };
  imageFormat?: 'og' | 'preview';
}) {
  const chain = getChainById({ chainId: bountyData.chainId });

  const addressesWithoutFarcaster = bountyData.participants.filter(
    (p) => !farcasterParticipants[p]?.[0]?.username
  );
  const resolvedNames = await resolveWeiOrEnsOrDegenNames(
    addressesWithoutFarcaster
  );

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        padding: imageFormat === 'preview' ? '16px' : '42px',
        paddingBottom: imageFormat === 'preview' ? '12px' : '42px',
        paddingTop: imageFormat === 'preview' ? '36px' : '42px',
        display: 'flex',
        flexDirection: 'column',
        background:
          'linear-gradient(to bottom, #2a81d5, #70aae2, #6fa9e1, #2a81d5)',
        color: 'white',
        fontFamily: 'Inter',
      }}
    >
      <h3
        style={{
          fontSize: imageFormat === 'preview' ? '34px' : '52px',
          fontWeight: 700,
          margin: 0,
          marginBottom: imageFormat === 'preview' ? '14px' : '24px',
          lineHeight: 1.2,
          wordWrap: 'break-word',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          textOverflow: 'ellipsis',
          minHeight: '76px',
        }}
      >
        {bountyData.title}
      </h3>
      <div
        style={{
          marginTop: imageFormat === 'preview' ? '0px' : '12px',
          display: 'flex',
          flexWrap: 'wrap',
          rowGap: imageFormat === 'preview' ? '4px' : '12px',
          fontSize: '20px',
          overflow: 'hidden',
        }}
      >
        {bountyData?.participants.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              rowGap: imageFormat === 'preview' ? '6px' : '12px',
              fontSize: imageFormat === 'preview' ? '22px' : '36px',
              maxHeight: imageFormat === 'preview' ? '128px' : '222px',
              columnGap: imageFormat === 'preview' ? '20px' : '30px',
              overflow: 'hidden',
            }}
          >
            <span style={{ display: 'flex' }}>contributors:</span>
            {bountyData.participants.map((p: string) => (
              <span
                key={p}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: imageFormat === 'preview' ? '6px' : '12px',
                  lineHeight: 1.4,
                  whiteSpace: 'nowrap',
                }}
              >
                <picture
                  style={{
                    marginRight: imageFormat === 'preview' ? '6px' : '12px',
                  }}
                >
                  <source
                    srcSet={
                      (farcasterParticipants[p] &&
                        farcasterParticipants[p][0]?.pfp_url) ||
                      `${process.env.NEXT_PUBLIC_APP_URL}/images/unknown.png`
                    }
                    type='image/svg+xml'
                  />
                  <img
                    src={
                      (farcasterParticipants[p] &&
                        farcasterParticipants[p][0]?.pfp_url) ||
                      `${process.env.NEXT_PUBLIC_APP_URL}/images/unknown.png`
                    }
                    width={imageFormat === 'preview' ? 32 : 52}
                    height={imageFormat === 'preview' ? 32 : 52}
                    alt='POIDH Logo'
                    style={{
                      borderRadius: '50%',
                      objectFit: 'cover',
                      flexShrink: 0,
                    }}
                  />
                </picture>
                <span>
                  {(farcasterParticipants[p] &&
                    farcasterParticipants[p][0]?.username) ??
                    resolvedNames[p] ??
                    p.slice(0, 6)}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          fontSize: imageFormat === 'preview' ? '30px' : '44px',
          fontWeight: 600,
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'center',
          borderRadius: '8px',
        }}
      >
        {formatAmount({
          amount: formatEther(BigInt(bountyData.amount)),
          price: bountyData.currencyRate.toString(),
          currency: chain.currency,
          precision: 4,
        })}
      </div>
      <div
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '8px',
        }}
      >
        <div
          style={{
            height: imageFormat === 'preview' ? '42px' : '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
          }}
        >
          <picture>
            <source
              srcSet='https://poidh.xyz/Logo_poidh.svg'
              type='image/svg+xml'
            />
            <img
              src='https://poidh.xyz/Logo_poidh.svg'
              width={imageFormat === 'preview' ? 84 : 124}
              height={imageFormat === 'preview' ? 42 : 64}
              alt='POIDH Logo'
              style={{
                objectFit: 'contain',
              }}
            />
          </picture>
        </div>
        <DynamicChainIcon
          chain={chain.slug}
          size={imageFormat === 'preview' ? 32 : 48}
        />
      </div>
    </div>
  );
}
