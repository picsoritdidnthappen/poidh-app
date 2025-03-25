import { formatWalletAddress, getDegenOrEnsName } from '@/utils/web3';
import { ArbitrumIcon, BaseIcon, DegenIcon } from '@/components/global/Icons';
import { ImageResponse } from '@vercel/og';
import React from 'react';
import { Netname } from '@/utils/types';

const truncateName = (name: string, maxLength = 35) => {
  if (!name || name.length <= maxLength) return name;
  return name.slice(0, maxLength) + '..';
};

export const runtime = 'edge';

const getChainIcon = (chain: string) => {
  switch (chain.toLowerCase()) {
    case 'arbitrum':
      return <ArbitrumIcon width={90} height={90} />;
    case 'base':
      return <BaseIcon width={90} height={90} />;
    case 'degen':
      return <DegenIcon width={90} height={90} />;
    default:
      return null;
  }
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const address = params.get('address');
  const chain = params.get('chain');
  const poidhScore = params.get('poidhScore');
  const totalEarn = params.get('totalEarn');
  const totalPaid = params.get('totalPaid');
  const nftsCount = params.get('nftsCount');
  const degenOrEnsName = await getDegenOrEnsName({
    chainName: chain as Netname,
    address: address as string,
  });

  if (
    !address ||
    !chain ||
    !poidhScore ||
    !totalEarn ||
    !totalPaid ||
    !nftsCount
  ) {
    return new Response('Missing or invalid parameters', { status: 400 });
  }

  try {
    const logoData = await fetch(
      new URL(`https://poidh.xyz/Logo_poidh.svg`)
    ).then((res) => res.arrayBuffer());

    const fontData = await fetch(
      new URL(
        '../../../../../public/fonts/GeistMono-Regular.ttf',
        import.meta.url
      )
    ).then((res) => res.arrayBuffer());

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            background:
              'linear-gradient(to bottom, #2a81d5, #70aae2, #6fa9e1, #2a81d5)',
            padding: '50px 70px',
            color: 'white',
            fontFamily: '"GeistMono", sans-serif',
          }}
        >
          <div
            style={{
              display: 'flex',
              marginBottom: '30px',
              marginRight: '15px',
            }}
          >
            <picture>
              <source
                srcSet={`data:image/svg+xml;base64,${Buffer.from(
                  logoData
                ).toString('base64')}`}
                type='image/svg+xml'
              />
              <img
                src={`data:image/svg+xml;base64,${Buffer.from(
                  logoData
                ).toString('base64')}`}
                width={150}
                alt='POIDH Logo'
              />
            </picture>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              marginBottom: '25px',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: '58px',
                fontWeight: 600,
                width: '85%',
                lineHeight: '1.2',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '43px',
                  color: '#ffffff',
                }}
              >
                {degenOrEnsName
                  ? truncateName(degenOrEnsName)
                  : formatWalletAddress(address)}
              </span>
              <span
                style={{
                  fontSize: '32px',
                  color: '#ffffff',
                  opacity: 0.6,
                }}
              >
                {degenOrEnsName ? formatWalletAddress(address) : null}
              </span>
            </h2>
            <div
              style={{
                marginLeft: '20px',
                flexShrink: 0,
                display: 'flex',
                fontSize: '30px',
              }}
            >
              {getChainIcon(chain)}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              width: '100%',
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '24px',
              borderRadius: '16px',
              marginTop: '20px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                width: '100%',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  gap: '12px',
                  width: '100%',
                }}
              >
                {[
                  { label: 'NFTs', value: nftsCount },
                  { label: 'POIDH Score', value: poidhScore },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      padding: '16px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '12px',
                      width: '50%',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '24px',
                        color: 'rgba(255, 255, 255, 0.7)',
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        fontSize: '32px',
                        color: '#ffffff',
                        fontWeight: '600',
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  gap: '12px',
                  width: '100%',
                }}
              >
                {[
                  { label: 'Total Earned', value: totalEarn },
                  { label: 'Total Paid', value: totalPaid },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      padding: '16px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '12px',
                      width: '50%',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '24px',
                        color: 'rgba(255, 255, 255, 0.7)',
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        fontSize: '32px',
                        color: '#ffffff',
                        fontWeight: '600',
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: 'GeistMono',
            data: fontData,
            style: 'normal',
          },
        ],
      }
    );
  } catch (error) {
    console.error(error);
    return new Response('Error generating image', { status: 500 });
  }
}
