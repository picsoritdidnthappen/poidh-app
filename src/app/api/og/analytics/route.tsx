import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';

// Match the existing poidh bounty OG cards (not the flat mini-app splash blue).
const OG_BACKGROUND = 'linear-gradient(to bottom, #2a81d5, #70aae2, #6fa9e1, #2a81d5)';
const BOUNTY_RED = '#f15e5f';
const CLAIM_CREAM = '#fff8e8';
const VOTE_BLUE = '#175fa8';

// Decorative bars, not represented as live or historical transaction counts.
// Fixed numbers keep social previews stable and cacheable.
const activityHeights = [
  108, 151, 127, 195, 159,
  117, 251, 190, 132, 183,
  228, 171, 274, 219, 154,
  244, 201, 301, 239, 275,
];

// Exactly 20 deliberately varied stacked bars: claims dominate, bounties
// account for a smaller middle share, and votes are only a thin accent.
const bars = activityHeights.map((total, i) => {
  const bounties = Math.round(total * (0.23 + (i % 4) * 0.018));
  const votes = Math.round(total * [0.05, 0.08, 0.04, 0.1, 0.06][i % 5]);
  return { bounties, claims: total - bounties - votes, votes };
});

export async function GET(request: Request) {
  const farcaster = new URL(request.url).searchParams.get('format') === 'farcaster';
  const height = farcaster ? 800 : 630;
  const chartHeight = farcaster ? 428 : 300;
  const tallestBar = Math.max(
    ...bars.map((bar) => bar.bounties + bar.claims + bar.votes),
  );
  const heightScale = (chartHeight - 8) / tallestBar;

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
            gap: 12,
          }}
        >
          {bars.map((bar, index) => {
            // Every bar flexes to fill its share of the entire chart width.
            // The last bar finishes flush with the right edge of the emoji.
            const scale = heightScale;
            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  flex: 1,
                  minWidth: 0,
                  height: '100%',
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
