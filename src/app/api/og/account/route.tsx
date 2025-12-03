import { formatWalletAddress, getEnsOrDegenName } from '@/utils/web3';
import { ImageResponse } from '@vercel/og';

const truncateName = (name: string, maxLength = 35) => {
  if (!name || name.length <= maxLength) return name;
  return name.slice(0, maxLength) + '..';
};

export const runtime = 'edge';

const getProfilePictureUrl = async (
  pfpUrl: string | null | undefined
): Promise<string> => {
  const fallbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/images/unknown.png`;

  if (!pfpUrl) {
    return fallbackUrl;
  }

  try {
    const response = await fetch(pfpUrl, { method: 'HEAD' });
    if (response.ok) {
      return pfpUrl;
    }
    return fallbackUrl;
  } catch (error) {
    return fallbackUrl;
  }
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const address = searchParams.get('address');
  const poidhScore = searchParams.get('poidhScore');
  const imageFormat = searchParams.get('imageFormat');
  const totalBounties = searchParams.get('totalBounties');
  const totalClaims = searchParams.get('totalClaims');

  if (
    !address ||
    !poidhScore ||
    !imageFormat ||
    !totalClaims ||
    !totalBounties
  ) {
    return new Response('Missing or invalid parameters', { status: 400 });
  }

  try {
    const degenOrEnsName = await getEnsOrDegenName({
      chainName: 'base',
      address: address as string,
    });
    const fontData = await fetch(
      new URL(
        '../../../../../public/fonts/GeistMono-Regular.ttf',
        import.meta.url
      )
    ).then((res) => res.arrayBuffer());
    const pixeloidFontData = await fetch(
      new URL(
        '../../../../../public/fonts/PixeloidSans-Regular.ttf',
        import.meta.url
      )
    ).then((res) => res.arrayBuffer());
    const farcasterProfile = await loadFarcasterProfile(address);

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background:
              'linear-gradient(to bottom, #2a81d5, #70aae2, #6fa9e1, #2a81d5)',
            padding: imageFormat === 'og' ? '42px' : '24px',
            color: 'white',
            fontFamily: '"GeistMono", sans-serif',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              marginTop: '10px',
            }}
          >
            <div
              style={{
                fontSize: imageFormat === 'og' ? '48px' : '36px',
                fontWeight: 600,
                width: '85%',
                lineHeight: '1.2',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  gap: '8px',
                  alignItems: 'center',
                }}
              >
                {farcasterProfile?.pfp_url && (
                  <div
                    style={{
                      marginRight: '12px',
                      display: 'flex',
                      borderRadius: '50%',
                      width: imageFormat === 'og' ? 76 : 48,
                      height: imageFormat === 'og' ? 76 : 48,
                      overflow: 'hidden',
                    }}
                  >
                    <picture>
                      <source
                        srcSet={farcasterProfile?.pfp_url}
                        type='image/svg+xml'
                      />
                      <img
                        src={farcasterProfile?.pfp_url}
                        width={imageFormat === 'og' ? 76 : 48}
                        alt='POIDH Logo'
                        style={{
                          flexShrink: 0,
                          display: 'block',
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </picture>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span
                    style={{
                      fontSize: imageFormat === 'og' ? '43px' : '28px',
                      color: '#ffffff',
                    }}
                  >
                    {farcasterProfile
                      ? farcasterProfile?.username
                      : degenOrEnsName
                      ? truncateName(degenOrEnsName)
                      : formatWalletAddress(address)}
                  </span>
                  <span
                    style={{
                      fontSize: imageFormat === 'og' ? '32px' : '24px',
                      color: '#ffffff',
                      opacity: 0.6,
                    }}
                  >
                    {farcasterProfile?.username || degenOrEnsName
                      ? formatWalletAddress(address)
                      : null}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: imageFormat === 'og' ? '12px' : '6px',
              width: '100%',
              background: 'rgba(255, 255, 255, 0.1)',
              padding: imageFormat === 'og' ? '24px' : '12px',
              borderRadius: '16px',
              marginTop: imageFormat === 'og' ? '20px' : '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: imageFormat === 'og' ? '12px' : '8px',
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
                  { label: 'total bounties', value: totalBounties ?? '—' },
                  { label: 'total claims', value: totalClaims ?? '—' },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: imageFormat === 'og' ? '8px' : '6px',
                      padding: imageFormat === 'og' ? '16px' : '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '12px',
                      width: imageFormat === 'og' ? '50%' : '49%',
                    }}
                  >
                    <div
                      style={{
                        fontSize: imageFormat === 'og' ? '24px' : '16px',
                        color: 'rgba(255, 255, 255, 0.7)',
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        fontSize: imageFormat === 'og' ? '32px' : '20px',
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
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    gap: imageFormat === 'og' ? '12px' : '8px',
                    padding: imageFormat === 'og' ? '16px' : '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    width: '100%',
                  }}
                >
                  <div
                    style={{
                      fontSize: imageFormat === 'og' ? '28px' : '18px',
                      color: 'rgba(255, 255, 255, 0.7)',
                    }}
                  >
                    poidh score
                  </div>
                  <div
                    style={{
                      fontSize: imageFormat === 'og' ? '84px' : '48px',
                      color: '#ff6f6f',
                      fontWeight: 700,
                      lineHeight: 1,
                      letterSpacing: '2px',
                      fontFamily: '"PixeloidSans", "GeistMono", sans-serif',
                      textShadow:
                        imageFormat === 'og'
                          ? '-2px -2px 0 #ffffff, 2px -2px 0 #ffffff, -2px 2px 0 #ffffff, 2px 2px 0 #ffffff, 0 -2px 0 #ffffff, -2px 0 0 #ffffff, 2px 0 0 #ffffff, 0 2px 0 #ffffff'
                          : '-1px -1px 0 #ffffff, 1px -1px 0 #ffffff, -1px 1px 0 #ffffff, 1px 1px 0 #ffffff, 0 -1px 0 #ffffff, -1px 0 0 #ffffff, 1px 0 0 #ffffff, 0 1px 0 #ffffff',
                    }}
                  >
                    {poidhScore}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '8px',
            }}
          >
            <div
              style={{
                height: imageFormat === 'og' ? '64px' : '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
              }}
            >
              <picture>
                <source
                  srcSet='https://poidh.xyz/Logo_poidh.svg'
                  type='image/svg+xml'
                />
                <img
                  src='https://poidh.xyz/Logo_poidh.svg'
                  width={imageFormat === 'og' ? 124 : 84}
                  alt='POIDH Logo'
                />
              </picture>
            </div>
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
          {
            name: 'PixeloidSans',
            data: pixeloidFontData,
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

async function loadFarcasterProfile(address: string) {
  try {
    const farcasterParticipantsResponse = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${encodeURIComponent(
        address
      )}`,
      {
        headers: {
          'x-api-key': process.env.NEYNAR_API_KEY || '',
          'Content-Type': 'application/json',
        },
      }
    );
    const farcasterParticipants = await farcasterParticipantsResponse.json();
    const profile = farcasterParticipants?.[address.toLowerCase()]?.[0]
      ? farcasterParticipants?.[address.toLowerCase()]?.[0]
      : null;

    if (profile) {
      profile.pfp_url = await getProfilePictureUrl(profile.pfp_url);
    }

    return profile;
  } catch (error) {
    return null;
  }
}
