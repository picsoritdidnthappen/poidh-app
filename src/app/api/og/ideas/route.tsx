import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';

const OG_BACKGROUND =
  'linear-gradient(to bottom, #2a81d5, #70aae2, #6fa9e1, #2a81d5)';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const farcaster = params.get('format') === 'farcaster';

  const height = farcaster ? 800 : 630;

  // Use the same official logo and Geist Mono font
  // as poidh's existing bounty draft OG cards.
  const [logoResponse, fontResponse] = await Promise.all([
    fetch('https://poidh.xyz/Logo_poidh.svg', {
      cache: 'force-cache',
    }),
    fetch(
      new URL(
        '../../../../../public/fonts/GeistMono-Regular.ttf',
        import.meta.url
      )
    ),
  ]);

  if (!logoResponse.ok || !fontResponse.ok) {
    return new Response('Preview assets unavailable', {
      status: 503,
    });
  }

  const logoSvg = await logoResponse.text();
  const logo = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    logoSvg
  )}`;
  const fontData = await fontResponse.arrayBuffer();

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: OG_BACKGROUND,
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        padding: '52px 62px',
        fontFamily: 'GeistMono',
      }}
    >
      {/* Header: identical treatment to bounty draft OG */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 112,
        }}
      >
        <img
          src={logo}
          alt='poidh'
          width={300}
          height={100}
          style={{ objectFit: 'contain' }}
        />

      </div>

      {/* Main content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          justifyContent: 'center',
          minHeight: 0,
          paddingTop: farcaster ? 36 : 18,
          paddingBottom: 22,
        }}
      >
        <div
          style={{
            display: 'flex',
            fontWeight: 700,
            fontSize: farcaster ? 108 : 100,
            lineHeight: 1.15,
            letterSpacing: -1.5,
          }}
        >
          ideas
        </div>

      </div>

      {/* Footer: same separator and typography as draft OG */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          borderTop: '2px solid rgba(255,255,255,0.35)',
          paddingTop: 29,
          gap: 13,
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 25,
            opacity: 0.87,
          }}
        >
          the community idea board
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: farcaster ? 35 : 32,
            fontWeight: 700,
          }}
        >
          post an idea. vote. discuss. fund.
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height,
      emoji: 'twemoji',
      fonts: [
        {
          name: 'GeistMono',
          data: fontData,
          style: 'normal',
        },
      ],
      headers: {
        'Cache-Control':
          'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    }
  );
}
