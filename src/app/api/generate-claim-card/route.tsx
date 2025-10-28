import { ImageResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const image = url.searchParams.get('image');
  const title = url.searchParams.get('title');
  const issuer = url.searchParams.get('issuer');
  const pfp = url.searchParams.get('pfp') ?? undefined;

  if (!image || !title || !issuer) {
    return new Response('Missing required parameters', { status: 400 });
  }

  return render({ image, title, issuer, pfp });
}

async function render({
  image,
  title,
  issuer,
  pfp,
}: {
  image: string;
  title: string;
  issuer: string;
  pfp?: string;
}) {
  const WIDTH = 768;
  const HEIGHT = 972;

  let fetchedSrc: string | undefined = undefined;
  if (image) {
    try {
      const res = await fetch(image);
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        const base64 = Buffer.from(arrayBuf).toString('base64');
        const mime = res.headers.get('content-type') || 'image/jpeg';
        fetchedSrc = `data:${mime};base64,${base64}`;
      }
    } catch {}
    /* eslint-enable no-empty */
  }

  const fontData = await loadFont();

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          backgroundColor: 'rgb(241, 94, 95)',
          borderRadius: 40,
          display: 'flex',
          flexDirection: 'column',
          padding: 28,
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            height: 680,
            borderRadius: 8,
            overflow: 'hidden',
            background: '#00000011',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '5px solid rgba(255,255,255,0.25)',
          }}
        >
          {fetchedSrc ? (
            <img
              src={fetchedSrc}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                color: 'rgba(255,255,255,0.6)',
                letterSpacing: 1,
              }}
            >
              no image
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: 64,
              lineHeight: 1.2,
              fontWeight: 800,
              color: '#FFF',
              textTransform: 'none',
              letterSpacing: -1,
              textShadow: '0 2px 0 rgba(0,0,0,0.08)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 28,
              color: '#FFF',
              fontWeight: 500,
              marginTop: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span>issuer:</span>
            {pfp && (
              <picture style={{ marginRight: 0 }}>
                <source srcSet={pfp} type='image/svg+xml' />
                <img
                  src={pfp}
                  width={48}
                  height={48}
                  alt='Issuer Profile Picture'
                  style={{
                    borderRadius: '50%',
                    objectFit: 'cover',
                    flexShrink: 0,
                  }}
                />
              </picture>
            )}
            <span>{issuer.replace(/@/g, '')}</span>
          </div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
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
    '../../../../public/fonts/GeistMono-Regular.ttf',
    import.meta.url
  );
  return fetch(fontUrl).then((r) => r.arrayBuffer());
}
