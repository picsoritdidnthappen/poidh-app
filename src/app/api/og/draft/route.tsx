import { ImageResponse } from '@vercel/og';
import { formatWalletAddress, resolveHumanReadableNames } from '@/utils/web3';

export const runtime = 'edge';

const OG_BACKGROUND =
  'linear-gradient(to bottom, #2a81d5, #70aae2, #6fa9e1, #2a81d5)';
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

const truncateName = (name: string, maxLength = 35) =>
  name.length > maxLength ? `${name.slice(0, maxLength)}..` : name;

// Same Neynar identity lookup used by poidh's account OG image renderer.
async function loadFarcasterProfile(address: string): Promise<{
  username: string | null;
  pfp_url: string | null;
} | null> {
  const apiKey = process.env.NEYNAR_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${encodeURIComponent(address)}`,
      {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );
    if (!response.ok) return null;

    const data = await response.json();
    const profile = data?.[address.toLowerCase()]?.[0];
    if (!profile) return null;

    let pfp: string | null = null;
    if (typeof profile.pfp_url === 'string') {
      try {
        const url = new URL(profile.pfp_url);
        if (url.protocol === 'https:') {
          const head = await fetch(url.toString(), { method: 'HEAD' });
          if (head.ok) {
            pfp = url.toString();
          }
        }
      } catch {
        // Missing or inaccessible avatar: still render the resolved name.
      }
    }

    return {
      username: typeof profile.username === 'string' ? profile.username : null,
      pfp_url: pfp,
    };
  } catch {
    // Neynar failure must never prevent an OG preview from rendering.
    return null;
  }
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const farcaster = params.get('format') === 'farcaster';
  const rawTitle = params.get('title')?.trim() ?? '';
  const rawAddress = params.get('address') ?? '';

  if (!rawTitle || rawTitle.length > 200 || !ADDRESS_PATTERN.test(rawAddress)) {
    return new Response('Invalid draft image parameters', { status: 400 });
  }

  const address = rawAddress.toLowerCase();
  const title =
    rawTitle.length > 90
      ? `${rawTitle.slice(0, 87).trimEnd()}…`
      : rawTitle;
  const height = farcaster ? 800 : 630;
  const headingSize = title.length > 62 ? 55 : title.length > 38 ? 66 : 79;

  // The account OG route uses the same ENS/Degen resolver and Neynar endpoint.
  // Resolve independently so a problem with either service never breaks the card.
  const [names, farcasterProfile] = await Promise.all([
    resolveHumanReadableNames([address]).catch(() => ({} as Record<string, string>)),
    loadFarcasterProfile(address),
  ]);
  const degenOrEnsName = names[address] ?? null;
  const resolvedName = farcasterProfile?.username || degenOrEnsName;
  const displayName = resolvedName
    ? truncateName(resolvedName)
    : formatWalletAddress(address);

  // Use the same official logo and GeistMono font already used by poidh OG cards.
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
          flexDirection: 'column',
          borderTop: '2px solid rgba(255,255,255,0.35)',
          paddingTop: 29,
          gap: 13,
        }}
      >
        <div style={{ display: 'flex', fontSize: 25, opacity: 0.87 }}>
          draft author
        </div>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 18 }}>
          {farcasterProfile?.pfp_url ? (
            <div
              style={{
                display: 'flex',
                width: 68,
                height: 68,
                borderRadius: 999,
                overflow: 'hidden',
                flexShrink: 0,
                border: '2px solid rgba(255,255,255,0.35)',
              }}
            >
              <img
                src={farcasterProfile.pfp_url}
                alt='Draft author avatar'
                width={68}
                height={68}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          ) : null}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', fontSize: 38, fontWeight: 700 }}>
              {displayName}
            </div>
            {resolvedName ? (
              <div style={{ display: 'flex', fontSize: 23, opacity: 0.75 }}>
                {formatWalletAddress(address)}
              </div>
            ) : null}
          </div>
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
