import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';

// Match the existing poidh bounty OG cards (not the flat mini-app splash blue).
const OG_BACKGROUND = 'linear-gradient(to bottom, #2a81d5, #70aae2, #6fa9e1, #2a81d5)';
const BOUNTY_RED = '#f15e5f';
const CLAIM_CREAM = '#fff8e8';
const VOTE_BLUE = '#175fa8';

// Decorative bars, not represented as live or historical transaction counts.
// Fixed numbers keep social previews stable and cacheable.
const bars = Array.from({ length: 47 }, (_, i) => {
  const waves = Math.sin(i * 0.48) * 0.5 + Math.sin(i * 1.17) * 0.28;
  const spike = [8, 17, 25, 35, 40, 44].includes(i) ? 57 : 0;
  const size = Math.max(45, 77 + i * 3.3 + waves * 72 + spike);
  return {
    bounties: Math.round(size * (0.22 + (i % 4) * 0.025)),
    claims: Math.round(size * (0.64 + (i % 3) * 0.025)),
    votes: Math.round(size * (0.07 + (i % 5) * 0.009)),
  };
});

export async function GET(request: Request) {
  const farcaster = new URL(request.url).searchParams.get('format') === 'farcaster';
  const height = farcaster ? 800 : 630;
  const chartHeight = farcaster ? 428 : 300;

  // Use poidh's ACTUAL SVG wordmark. Never generate or approximate the logo.
  const logoResponse = await fetch('https://poidh.xyz/Logo_poidh.svg', {
    cache: 'force-cache',
  });
  if (!logoResponse.ok) {
    return new Response('Official poidh logo could not be loaded', { status: 503 });
  }
  const logoSvg = await logoResponse.text();
  const officialLogo = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(logoSvg)}`;

  // Load the same Geist Mono font asset as poidh's existing bounty OG renderer.
  const fontUrl = new URL('../../../../../public/fonts/GeistMono-Regular.ttf', import.meta.url);
  const fontResponse = await fetch(fontUrl);
  if (!fontResponse.ok) {
    return new Response('Official poidh font could not be loaded', { status: 503 });
  }
  const fontData = await fontResponse.arrayBuffer();

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: OG_BACKGROUND,
        display: 'flex',
        flexDirection: 'column',
        padding: '48px 56px 42px',
        color: 'white',
        fontFamily: 'GeistMono',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 135 }}>
        <img
          src={officialLogo}
          alt='poidh'
          width={355}
          height={120}
          style={{ objectFit: 'contain' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span style={{ color: '#ffffff', fontSize: 81, fontWeight: 700, letterSpacing: -3 }}>
            analytics
          </span>
          <span style={{ display: 'flex', alignItems: 'center', fontSize: 72, lineHeight: 1 }}>📊</span>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, alignItems: 'flex-end', marginTop: farcaster ? 75 : 42 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            width: '100%',
            height: chartHeight,
            gap: 7,
          }}
        >
          {bars.map((bar, index) => {
            const total = bar.bounties + bar.claims + bar.votes;
            const scale = Math.min(1, (chartHeight - 10) / Math.max(210, total));
            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  width: 15,
                  height: '100%',
                  flexShrink: 0,
                }}
              >
                <div style={{ height: bar.votes * scale, backgroundColor: VOTE_BLUE }} />
                <div style={{ height: bar.claims * scale, backgroundColor: CLAIM_CREAM }} />
                <div style={{ height: bar.bounties * scale, backgroundColor: BOUNTY_RED }} />
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 50, marginTop: 30, height: 42 }}>
        {[
          { name: 'bounties', color: BOUNTY_RED },
          { name: 'claims', color: CLAIM_CREAM },
          { name: 'votes', color: VOTE_BLUE },
        ].map((item) => (
          <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 22, height: 22, borderRadius: 22, backgroundColor: item.color }} />
            <span style={{ color: 'white', fontSize: 31, fontWeight: 700 }}>{item.name}</span>
          </div>
        ))}
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
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    },
  );
}
