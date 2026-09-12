import { useEffect, useState } from 'react';

const VIDEO_EXTENSIONS = /\.(mp4|mov|webm|ogg)(\?.*)?$/i;
const IMAGE_EXTENSIONS =
  /\.(avif|bmp|gif|jpe?g|png|svg|webp)(\?.*)?$/i;

function isVideoUrl(url: string) {
  return VIDEO_EXTENSIONS.test(url);
}

function isImageUrl(url: string) {
  return IMAGE_EXTENSIONS.test(url);
}

export function useClaimMedia(
  url: string | null | undefined,
  enabled = true
) {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [isLoading, setIsLoading] = useState(enabled && !!url);
  const [mediaError, setMediaError] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    if (!url || typeof url !== 'string') {
      setMediaUrl(null);
      setIsVideo(false);
      setMediaError(false);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const resolve = async () => {
      setMediaUrl(null);
      setMediaError(false);
      setIsLoading(true);

      /*
       * Fast path:
       * normal direct image/video URLs need zero probing.
       */
      if (isVideoUrl(url)) {
        if (!cancelled) {
          setMediaUrl(url);
          setIsVideo(true);
          setIsLoading(false);
        }
        return;
      }

      if (isImageUrl(url)) {
        if (!cancelled) {
          setMediaUrl(url);
          setIsVideo(false);
          setIsLoading(false);
        }
        return;
      }

      /*
       * Ambiguous URLs — usually extensionless IPFS URLs.
       *
       * Try HEAD first so we can inspect content-type without
       * downloading the whole image/video.
       */
      try {
        const timeout = window.setTimeout(() => {
          controller.abort();
        }, 2500);

        const headResponse = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
        });

        window.clearTimeout(timeout);

        const contentType =
          headResponse.headers.get('content-type')?.toLowerCase() ?? '';

        if (contentType.startsWith('video/')) {
          if (!cancelled) {
            setMediaUrl(url);
            setIsVideo(true);
            setIsLoading(false);
          }
          return;
        }

        if (contentType.startsWith('image/')) {
          if (!cancelled) {
            setMediaUrl(url);
            setIsVideo(false);
            setIsLoading(false);
          }
          return;
        }

        /*
         * If HEAD tells us it's JSON, fetch the metadata body.
         */
        if (
          contentType.includes('json') ||
          contentType.startsWith('text/')
        ) {
          const metadataController = new AbortController();

          const metadataTimeout = window.setTimeout(() => {
            metadataController.abort();
          }, 2500);

          const response = await fetch(url, {
            signal: metadataController.signal,
          });

          window.clearTimeout(metadataTimeout);

          const data = await response.json().catch(() => null);

          if (
            data &&
            typeof data === 'object' &&
            typeof data.image === 'string'
          ) {
            if (!cancelled) {
              setMediaUrl(data.image);
              setIsVideo(isVideoUrl(data.image));
              setIsLoading(false);
            }
            return;
          }
        }
      } catch {
        /*
         * HEAD can fail because of CORS or gateway behavior.
         * Do not then perform an unlimited full download.
         */
      }

      /*
       * Last-resort behavior:
       *
       * Treat the URL as direct media and let the actual <Image>/<video>
       * element decide whether it can render it.
       *
       * This is intentionally cheaper than doing another arbitrary
       * full-file fetch.
       */
      if (!cancelled) {
        setMediaUrl(url);
        setIsVideo(false);
        setIsLoading(false);
      }
    };

    resolve();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [url, enabled]);

  return {
    mediaUrl,
    isVideo,
    isLoading,
    mediaError,
    setMediaError,
  };
}
