import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';

const OG_BACKGROUND =
  'linear-gradient(to bottom, #2a81d5, #70aae2, #6fa9e1, #2a81d5)';
const BOUNTY_RED = '#f15e5f';

const CHAIN_LABELS: Record<string, string> = {
  mainnet: 'Ethereum',
  base: 'Base',
  arbitrum: 'Arbitrum',
};

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const farcaster = params.get('format') === 'farcaster';
  const rawTitle = params.get('title')?.trim() ?? '';
  const rawAmount = params.get('amount')?.trim() ?? '';
  const chain = params.get('chain') ?? '';
  const kind = params.get('kind') ?? '';

  if (
    !rawTitle || rawTitle.length > 200 ||
    !/^\d+(?:\.\d{1,18})?$/.test(rawAmount) ||
    rawAmount.length > 50 ||
    !CHAIN_LABELS[chain] ||
    !['open', 'solo'].includes(kind)
  ) {
    return new Response('Invalid draft image parameters', { status: 400 });
  }

  // Full titles remain on the actual draft page. Truncate only for the card.
  const title = rawTitle.length > 90
    ? `${rawTitle.slice(0, 87).trimEnd()}…`
    : rawTitle;
  const height = farcaster ? 800 : 630;
  const headingSize = title.length > 62 ? 55 : title.length > 38 ? 66 : 79;

  // Reuse poidh's exact existing SVG logo and Geist Mono font, as on /analytics.
  const [logoResponse, fontResponse] = await Promise.all([
    fetch('https://poidh.xyz/Logo_poidh.svg', { cache: 'force-cache' }),
    fetch(new URL('../../../../../public/fonts/GeistMono-Regular.ttf', import.meta.url)),
  ]);
  if (!logoResponse.ok || !fontResponse.ok) {
    return new Response('Preview assets unavailable', { status: 503 });
  }
  const logoSvg = await logoResponse.text();
  const logo = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(logoSvg)}`;
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 112,
        }}
      >
        <img src={logo} alt='poidh' width={300} height={100} style={{ objectFit: 'contain' }} />
        <div
          style={{
            display: 'flex',
            borderRadius: 16,
            background: 'rgba(255,255,255,0.16)',
            border: '2px solid rgba(255,255,255,0.36)',
            padding: '14px 26px',
            fontSize: 31,
          }}
        >
          bounty draft
        </div>
      </div>

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
            fontSize: headingSize,
            lineHeight: 1.15,
            letterSpacing: -1.5,
            overflowWrap: 'anywhere',
          }}
        >
          {title}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '2px solid rgba(255,255,255,0.35)',
          paddingTop: 29,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 25, opacity: 0.87 }}>proposed reward</div>
          <div style={{ fontSize: 52, fontWeight: 700 }}>{rawAmount} ETH</div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            borderRadius: 13,
            background: BOUNTY_RED,
            border: '2px solid rgba(255,255,255,0.5)',
            padding: '14px 24px',
            fontSize: 28,
          }}
        >
          {CHAIN_LABELS[chain]} · {kind} bounty
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height,
      emoji: 'twemoji',
      fonts: [{ name: 'GeistMono', data: fontData, style: 'normal' }],
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    },
  );
}
