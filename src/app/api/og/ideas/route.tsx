import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const isFarcaster = searchParams.get('format') === 'farcaster';

  const width = 1200;
  const height = isFarcaster ? 800 : 630;

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        position: 'relative',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background:
          'linear-gradient(120deg, #102947 0%, #155a9c 55%, #237fc5 100%)',
        color: '#ffffff',
        padding: '64px 72px',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Background decoration */}
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          width: 650,
          height: 650,
          right: -180,
          top: -160,
          border: '2px solid rgba(255,255,255,0.15)',
          borderRadius: '50%',
        }}
      />

      <div
        style={{
          display: 'flex',
          position: 'absolute',
          width: 440,
          height: 440,
          right: -75,
          top: -55,
          border: '2px solid rgba(255,255,255,0.13)',
          borderRadius: '50%',
        }}
      />

      <div
        style={{
          display: 'flex',
          position: 'absolute',
          width: 230,
          height: 230,
          right: 42,
          top: 48,
          border: '2px solid rgba(255,255,255,0.12)',
          borderRadius: '50%',
        }}
      />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          width: '100%',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 49,
            fontWeight: 800,
            letterSpacing: -2,
          }}
        >
          poidh
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 19,
            letterSpacing: 4,
            color: '#d6ecff',
          }}
        >
          PICS OR IT DIDN'T HAPPEN
        </div>
      </div>

      {/* Main content */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 13,
            gap: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: '#f15e5f',
            }}
          />

          <span
            style={{
              fontSize: 21,
              color: '#d5eaff',
              letterSpacing: 3,
              fontWeight: 600,
            }}
          >
            THE COMMUNITY IDEA BOARD
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: isFarcaster ? 172 : 145,
            fontWeight: 800,
            letterSpacing: -9,
            lineHeight: 1.05,
          }}
        >
          ideas
          <span style={{ color: '#f15e5f' }}>.</span>
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 21,
            fontSize: isFarcaster ? 47 : 43,
            fontWeight: 500,
            lineHeight: 1.2,
            color: '#eef8ff',
            maxWidth: 880,
          }}
        >
          things people want to see happen
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 32,
            fontSize: 24,
            color: '#c8e3f8',
          }}
        >
          post an idea. vote on it. make it real.
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          position: 'relative',
          width: '100%',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 23,
          borderTop: '1px solid rgba(255,255,255,0.25)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 15,
            fontSize: 22,
            fontWeight: 600,
          }}
        >
          <span style={{ color: '#f15e5f' }}>↑</span>
          <span>vote</span>
          <span style={{ opacity: 0.4 }}>•</span>
          <span>discuss</span>
          <span style={{ opacity: 0.4 }}>•</span>
          <span>fund</span>
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 22,
            fontWeight: 700,
            color: '#ffffff',
          }}
        >
          poidh.xyz/ideas
        </div>
      </div>
    </div>,
    {
      width,
      height,
      headers: {
        'Cache-Control':
          'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    }
  );
}
