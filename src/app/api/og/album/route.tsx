import { ImageResponse } from '@vercel/og';
import React from 'react';

export const runtime = 'edge';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const album = params.get('album');
  const imageFormat = params.get('imageFormat') || 'og';
  if (!album) {
    return new Response('Missing or invalid parameters', { status: 400 });
  }

  const fontData = await loadFont();

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          background:
            'linear-gradient(to bottom, #2a81d5, #70aae2, #6fa9e1, #2a81d5)',
          padding: imageFormat === 'og' ? '42px' : '24px',
          color: 'white',
          fontFamily: '"GeistMono", sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '0 24px',
          }}
        >
          <h2
            style={{
              fontSize: imageFormat === 'og' ? 76 : 48,
              fontWeight: 700,
              letterSpacing: 0.6,
              textAlign: 'center',
              maxWidth: '90%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {album}
          </h2>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: imageFormat === 'og' ? 298 : 208,
          }}
        >
          <picture>
            <source
              srcSet='https://poidh.xyz/Logo_poidh.svg'
              type='image/svg+xml'
            />
            <img
              src='https://poidh.xyz/Logo_poidh.svg'
              width={imageFormat === 'og' ? 186 : 116}
              alt='POIDH Logo'
            />
          </picture>
        </div>
      </div>
    ),
    {
      width: imageFormat === 'og' ? 1200 : 600,
      height: imageFormat === 'og' ? 630 : 400,
      fonts: [
        {
          name: 'GeistMono',
          data: fontData,
          style: 'normal',
        },
      ],
    }
  );
}

async function loadFont(): Promise<ArrayBuffer> {
  const fontUrl = new URL(
    '../../../../../public/fonts/GeistMono-Bold.ttf',
    import.meta.url
  );
  return fetch(fontUrl).then((r) => r.arrayBuffer());
}
