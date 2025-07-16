import React from 'react';
import { formatAmount } from '@/utils/utils';
import { ArbitrumIcon, BaseIcon, DegenIcon } from '@/components/global/Icons';
import { formatEther } from 'viem';
import { ChainId } from '@/utils/types';
import { getChainById } from '@/utils/config';

export type BountyPreviewData = {
  title: string;
  amount: string;
  chainId: ChainId;
  currencyRate: number;
  participants: {
    address: string;
    farcasterName: string | null;
    pfpUrl: string | null;
  }[];
};

const getChainIcon = (chain: string, size = 80) => {
  switch (chain.toLowerCase()) {
    case 'arbitrum':
      return <ArbitrumIcon width={size} height={size} />;
    case 'base':
      return <BaseIcon width={size} height={size} />;
    case 'degen':
      return <DegenIcon width={size} height={size} />;
    default:
      return null;
  }
};

export default function BountyPreviewCard({
  bountyData,
}: {
  bountyData: BountyPreviewData;
}) {
  const chain = getChainById({ chainId: bountyData.chainId });

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        padding: '16px',
        paddingBottom: '12px',
        paddingTop: '36px',
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
          fontSize: '34px',
          fontWeight: 700,
          margin: 0,
          marginBottom: '14px',
          maxWidth: '500px',
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
          display: 'flex',
          flexWrap: 'wrap',
          rowGap: '4px',
          fontSize: '20px',
          overflow: 'hidden',
        }}
      >
        {bountyData?.participants.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              rowGap: '6px',
              fontSize: '22px',
              maxHeight: '128px',
              columnGap: '20px',
              overflow: 'hidden',
            }}
          >
            <span style={{ display: 'flex' }}>contributors:</span>
            {bountyData.participants.map((p) => (
              <span
                key={p.address}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '6px',
                  lineHeight: 1.4,
                  whiteSpace: 'nowrap',
                }}
              >
                <img
                  src={
                    p.pfpUrl ||
                    `${process.env.NEXT_PUBLIC_APP_URL}/images/unknown.png`
                  }
                  alt={p.farcasterName ?? p.address}
                  width={32}
                  height={32}
                  style={{
                    borderRadius: '50%',
                    marginRight: '6px',
                    marginLeft: 0,
                    objectFit: 'cover',
                    flexShrink: 0,
                  }}
                />
                <span style={{}}>
                  {p.farcasterName ?? p.address.slice(0, 6)}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          fontSize: '30px',
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
            width: '20%',
            height: '42px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
          }}
        >
          <img
            src='https://poidh.xyz/Logo_poidh.svg'
            width={84}
            height={42}
            alt='Logo'
            style={{
              objectFit: 'contain',
            }}
          />
        </div>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.2)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            border: '2px solid rgba(255,255,255,0.3)',
          }}
        >
          {getChainIcon(chain.slug, 32)}
        </div>
      </div>
    </div>
  );
}
