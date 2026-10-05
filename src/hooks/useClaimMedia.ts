import { useEffect, useState } from 'react';

const VIDEO_EXTENSIONS = /\.(mp4|mov|webm|ogg)(\?.*)?$/i;

const IPFS_URL_PATTERN = /https?:\/\/[^\s"]+\/ipfs\/[a-zA-Z0-9]+[^\s"]*/g;

export function useClaimMedia(url: string | null | undefined, enabled = true) {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);

  const [isVideo, setIsVideo] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  const [mediaError, setMediaError] = useState(false);

  useEffect(() => {
    const normalizedUrl = typeof url === 'string' ? url.trim() : '';

    /*
     * An empty URI is not something we need to resolve.
     *
     * Treat it exactly like failed/invalid media so every
     * consumer can immediately render its geometric fallback
     * instead of getting stuck in a loading state forever.
     */
    if (!normalizedUrl) {
      setMediaUrl(null);
      setIsVideo(false);
      setIsLoading(false);
      setMediaError(true);
      return;
    }

    /*
     * Allows components such as LatestClaimImages to defer
     * media resolution until the thumbnail is near/in view.
     */
    if (!enabled) {
      setMediaUrl(null);
      setIsVideo(false);
      setIsLoading(true);
      setMediaError(false);
      return;
    }

    let cancelled = false;

    const resolve = async () => {
      setMediaUrl(null);
      setIsVideo(false);
      setIsLoading(true);
      setMediaError(false);

      try {
        const response = await fetch(normalizedUrl);

        if (cancelled) {
          return;
        }

        const contentType = response.headers.get('content-type') ?? '';

        if (
          contentType.startsWith('video/') ||
          VIDEO_EXTENSIONS.test(normalizedUrl)
        ) {
          setMediaUrl(normalizedUrl);
          setIsVideo(true);
          setIsLoading(false);
          return;
        }

        if (contentType.startsWith('image/')) {
          setMediaUrl(normalizedUrl);
          setIsVideo(false);
          setIsLoading(false);
          return;
        }

        const text = await response.text();

        if (cancelled) {
          return;
        }

        try {
          const data = JSON.parse(text);

          if (typeof data.image === 'string' && data.image.trim()) {
            const resolvedImage = data.image.trim();

            setMediaUrl(resolvedImage);

            setIsVideo(VIDEO_EXTENSIONS.test(resolvedImage));

            setIsLoading(false);
            return;
          }
        } catch {
          // Not JSON — continue checking
          // the response for embedded IPFS URLs.
        }

        const matches = text.match(IPFS_URL_PATTERN);

        if (matches && matches.length > 0) {
          const videoMatch = matches.find((match) =>
            VIDEO_EXTENSIONS.test(match)
          );

          const chosen = videoMatch ?? matches[0];

          setMediaUrl(chosen);
          setIsVideo(!!videoMatch);
          setIsLoading(false);
          return;
        }

        setMediaUrl(null);
        setIsVideo(false);
        setMediaError(true);
        setIsLoading(false);
      } catch {
        if (cancelled) {
          return;
        }

        setMediaUrl(null);
        setIsVideo(false);
        setMediaError(true);
        setIsLoading(false);
      }
    };

    resolve();

    return () => {
      cancelled = true;
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
