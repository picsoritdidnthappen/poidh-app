import { ImageResponse } from '@vercel/og';
import { formatWalletAddress, resolveHumanReadableNames } from '@/utils/web3';

export const runtime = 'edge';

const OG_BACKGROUND =
  'linear-gradient(to bottom, #2a81d5, #70aae2, #6fa9e1, #2a81d5)';
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

// Match the established bounty OG renderer: public browsers revalidate, while
// Vercel's CDN can serve a previously good preview during transient failures.
const IMAGE_CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=0, must-revalidate',
  'Vercel-CDN-Cache-Control':
    'public, max-age=3600, stale-while-revalidate=86400, stale-if-error=86400',
};

// Avoid repeating the same font/logo requests in warm Edge isolates. A failed
// asset request resets the promise so the next request can retry.
let fontPromise: Promise<ArrayBuffer> | null = null;
let logoPromise: Promise<string> | null = null;

function loadFont(): Promise<ArrayBuffer> {
  if (!fontPromise) {
    const url = new URL(
      '../../../../../public/fonts/GeistMono-Regular.ttf',
      import.meta.url
    );
    fontPromise = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Draft OG font unavailable: ${res.status}`);
        return res.arrayBuffer();
      })
      .catch((error) => {
        fontPromise = null;
        throw error;
      });
  }
  return fontPromise;
}

function loadLogo(): Promise<string> {
  if (!logoPromise) {
    logoPromise = fetch('https://poidh.xyz/Logo_poidh.svg', {
      cache: 'force-cache',
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Draft OG logo unavailable: ${res.status}`);
        const svg = await res.text();
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      })
      .catch((error) => {
        logoPromise = null;
        throw error;
      });
  }
  return logoPromise;
}

// resolveHumanReadableNames doesn't accept an AbortSignal. Bound the amount of
// time the OG renderer waits for it; wallet-address fallback is always usable.
async function withTimeout<T>(
  promise: Promise<T>,
  milliseconds: number,
  fallback: T
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), milliseconds);
      }),
    ]);
  } catch {
    return fallback;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const truncateName = (name: string, maxLength = 35) =>
  name.length > maxLength ? `${name.slice(0, maxLength)}..` : name;

type FarcasterProfile = {
  username: string | null;
  pfp_url: string | null;
};

// Same Neynar bulk-by-address lookup and profile precedence as account OG.
// Optional enrichment is bounded: an unavailable identity service must never
// make the entire bounty draft preview unavailable.
async function loadFarcasterProfile(
  address: string
): Promise<FarcasterProfile | null> {
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
        signal: AbortSignal.timeout(3000),
      }
    );
    if (!response.ok) return null;

    const data = await response.json();
    const profile = data?.[address.toLowerCase()]?.[0];
    if (!profile) return null;

    const username =
      typeof profile.username === 'string' ? profile.username : null;
    let pfp: string | null = null;

    if (typeof profile.pfp_url === 'string') {
      try {
        const url = new URL(profile.pfp_url);
        if (url.protocol === 'https:') {
          const head = await fetch(url.toString(), {
            method: 'HEAD',
            signal: AbortSignal.timeout(1500),
          });
          if (head.ok) pfp = url.toString();
        }
      } catch {
        // Missing or inaccessible avatar: still render the resolved name.
      }
    }

    return { username, pfp_url: pfp };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const farcaster = params.get('format') === 'farcaster';
  const rawTitle = params.get('title')?.trim() ?? '';
  const rawAddress = params.get('address') ?? '';
  const genericFallback = !rawAddress;

  // The address-less format is only for generic fallback metadata when the
  // draft JSON gateway is temporarily unavailable. No author is invented.
  if (
    !rawTitle ||
    rawTitle.length > 200 ||
    (!genericFallback && !ADDRESS_PATTERN.test(rawAddress))
  ) {
    return new Response('Invalid draft image parameters', {
      status: 400,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const address = rawAddress.toLowerCase();
  const title =
    rawTitle.length > 90 ? `${rawTitle.slice(0, 87).trimEnd()}…` : rawTitle;
  const height = farcaster ? 800 : 630;
  const headingSize = title.length > 62 ? 55 : title.length > 38 ? 66 : 79;

  try {
    // Start assets and both optional identity lookups together.
    const [logo, fontData, names, farcasterProfile] = await Promise.all([
      loadLogo(),
      loadFont(),
      genericFallback
        ? Promise.resolve({} as Record<string, string>)
        : withTimeout(
            resolveHumanReadableNames([address]),
            3000,
            {} as Record<string, string>
          ),
      genericFallback
        ? Promise.resolve(null)
        : withTimeout(loadFarcasterProfile(address), 4500, null),
    ]);

    const degenOrEnsName = names[address] ?? null;
    const resolvedName = farcasterProfile?.username || degenOrEnsName;
    const displayName = genericFallback
      ? 'poidh'
      : resolvedName
        ? truncateName(resolvedName)
        : formatWalletAddress(address);

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
          <img
            src={logo}
            alt='poidh'
            width={300}
            height={100}
            style={{ objectFit: 'contain' }}
          />
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

        {genericFallback ? (
          <div
            style={{
              display: 'flex',
              borderTop: '2px solid rgba(255,255,255,0.35)',
              paddingTop: 29,
              fontSize: 30,
            }}
          >
            reusable poidh bounty draft
          </div>
        ) : (
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
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 18,
              }}
            >
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
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </div>
              ) : null}
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 5 }}
              >
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
        )}
      </div>,
      {
        width: 1200,
        height,
        emoji: 'twemoji',
        fonts: [{ name: 'GeistMono', data: fontData, style: 'normal' }],
        headers: IMAGE_CACHE_HEADERS,
      }
    );
  } catch (error) {
    console.error('Error generating draft OG image:', error);

    // A request failure still returns a usable basic PNG. Never CDN-cache a
    // transient error card as the successful social preview.
    return new ImageResponse(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: OG_BACKGROUND,
          color: '#ffffff',
          padding: 64,
        }}
      >
        <div style={{ display: 'flex', fontSize: 90, fontWeight: 700 }}>
          poidh
        </div>
        <div style={{ display: 'flex', fontSize: 60, marginTop: 32 }}>
          bounty draft
        </div>
      </div>,
      {
        width: 1200,
        height,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  }
}
