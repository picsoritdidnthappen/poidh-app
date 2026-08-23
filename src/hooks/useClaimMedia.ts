import { useState, useEffect } from 'react';

const IMAGE_EXTENSIONS =
  /\.(jpg|jpeg|png|gif|webp|avif|svg)(\?.*)?$/i;

const VIDEO_EXTENSIONS =
  /\.(mp4|mov|webm|ogg|m4v)(\?.*)?$/i;

const IMAGE_FORMAT_PARAM =
  /[?&]format=(jpg|jpeg|png|gif|webp|avif|svg)(?:&|$)/i;

const VIDEO_FORMAT_PARAM =
  /[?&]format=(mp4|mov|webm|ogg|m4v)(?:&|$)/i;

const IPFS_URL_PATTERN =
  /https?:\/\/[^\s"]+\/ipfs\/[a-zA-Z0-9]+[^\s"]*/g;

function isDirectImage(url: string) {
  return (
    IMAGE_EXTENSIONS.test(url) ||
    IMAGE_FORMAT_PARAM.test(url)
  );
}

function isDirectVideo(url: string) {
  return (
    VIDEO_EXTENSIONS.test(url) ||
    VIDEO_FORMAT_PARAM.test(url)
  );
}

export function useClaimMedia(
  url: string | null | undefined
) {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mediaError, setMediaError] = useState(false);

  useEffect(() => {
    if (!url || typeof url !== 'string') {
      setMediaUrl(null);
      setIsVideo(false);
      setIsLoading(false);
      setMediaError(false);
      return;
    }

    let cancelled = false;

    setMediaUrl(null);
    setIsVideo(false);
    setIsLoading(true);
    setMediaError(false);

    const resolve = async () => {
      /*
       * IMPORTANT:
       * Recognize direct media BEFORE fetch().
       *
       * Hosts such as video.twimg.com may allow a browser
       * <video> to load the resource while blocking JS fetch
       * because of CORS.
       */

      if (isDirectVideo(url)) {
        if (cancelled) return;

        setMediaUrl(url);
        setIsVideo(true);
        setIsLoading(false);
        return;
      }

      if (isDirectImage(url)) {
        if (cancelled) return;

        setMediaUrl(url);
        setIsVideo(false);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(url);

        if (cancelled) return;

        const contentType =
          response.headers.get('content-type') ?? '';

        if (contentType.startsWith('video/')) {
          setMediaUrl(url);
          setIsVideo(true);
          setIsLoading(false);
          return;
        }

        if (contentType.startsWith('image/')) {
          setMediaUrl(url);
          setIsVideo(false);
          setIsLoading(false);
          return;
        }

        const text = await response.text();

        if (cancelled) return;

        try {
          const data = JSON.parse(text);

          if (
            typeof data.animation_url === 'string' &&
            data.animation_url
          ) {
            const videoUrl = data.animation_url;

            setMediaUrl(videoUrl);
            setIsVideo(true);
            setIsLoading(false);
            return;
          }

          if (
            typeof data.video === 'string' &&
            data.video
          ) {
            setMediaUrl(data.video);
            setIsVideo(true);
            setIsLoading(false);
            return;
          }

          if (
            typeof data.image === 'string' &&
            data.image
          ) {
            setMediaUrl(data.image);
            setIsVideo(isDirectVideo(data.image));
            setIsLoading(false);
            return;
          }
        } catch {
          // Not JSON — continue to fallback.
        }

        const matches = text.match(IPFS_URL_PATTERN);

        if (matches?.length) {
          const videoMatch = matches.find((match) =>
            isDirectVideo(match)
          );

          const chosen = videoMatch ?? matches[0];

          setMediaUrl(chosen);
          setIsVideo(!!videoMatch);
          setIsLoading(false);
          return;
        }

        setMediaError(true);
        setIsLoading(false);
      } catch {
        if (cancelled) return;

        setMediaError(true);
        setIsLoading(false);
      }
    };

    resolve();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return {
    mediaUrl,
    isVideo,
    isLoading,
    mediaError,
  };
}
