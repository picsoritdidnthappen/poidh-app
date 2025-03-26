import { ArbitrumIcon, BaseIcon, DegenIcon } from '@/components/global/Icons';
import { Currency } from '@/utils/types';
import { fetchPrice, formatAmount } from '@/utils/utils';
import { ImageResponse } from '@vercel/og';
import React from 'react';
import { formatEther } from 'viem';

export const runtime = 'edge';

const getChainIcon = (chain: string) => {
  switch (chain.toLowerCase()) {
    case 'arbitrum':
      return <ArbitrumIcon width={80} height={80} />;
    case 'base':
      return <BaseIcon width={80} height={80} />;
    case 'degen':
      return <DegenIcon width={80} height={80} />;
    default:
      return null;
  }
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const title = params.get('title');
  const description = params.get('description');
  const chain = params.get('chain');
  const amount = params.get('amount');
  const currency = params.get('currency') as Currency;
  const price = await fetchPrice({ currency });

  if (!title || !description || !chain || !amount || !currency) {
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
            padding: '75px',
            color: 'white',
            fontFamily: '"GeistMono", sans-serif',
          }}
        >
          <div
            style={{
              display: 'flex',
              marginBottom: '25px',
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
              marginBottom: '5px',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: '50px',
                fontWeight: 600,
                width: '85%',
                lineHeight: '1.2',
                display: '-webkit-box',
                WebkitLineClamp: '2',
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxHeight: '130px',
                position: 'relative',
              }}
            >
              {title}
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
          <p
            style={{
              display: '-webkit-box',
              fontSize: '28px',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              width: '100%',
              height: '250px',
              WebkitLineClamp: 7,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {description}
          </p>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'flex-end',
              fontSize: '28px',
              position: 'absolute',
              bottom: '75px',
              right: '70px',
            }}
          >
            {formatAmount({
              amount: formatEther(BigInt(amount)),
              currency,
              price: price.toString(),
            })}
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
