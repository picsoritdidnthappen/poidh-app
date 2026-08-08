import { useState, useEffect } from 'react';

const IMAGE_EXTENSIONS =
  /\.(jpg|jpeg|png|gif|webp|avif|svg)(\?.*)?$/i;

const VIDEO_EXTENSIONS =
  /\.(mp4|mov|webm|ogg)(\?.*)?$/i;

const IMAGE_FORMAT_PARAM =
  /[?&]format=(jpg|jpeg|png|gif|webp|avif|svg)(?:&|$)/i;

const VIDEO_FORMAT_PARAM =
  /[?&]format=(mp4|mov|webm|ogg)(?:&|$)/i;

const IPFS_URL_PATTERN =
  /https?:\/\/[^\s"]+\/ipfs\/[a-zA-Z0-9]+[^\s"]*/g;

function isImageUrl(url: string) {
  return IMAGE_EXTENSIONS.test(url) || IMAGE_FORMAT_PARAM.test(url);
}

function isVideoUrl(url: string) {
  return VIDEO_EXTENSIONS.test(url) || VIDEO_FORMAT_PARAM.test(url);
}

export function useClaimMedia(url: string | null | undefined) {
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

    const resolve = async () => {
      setIsLoading(true);
      setMediaError(false);
      setMediaUrl(null);

      // Direct external image.
      // Handles normal URLs like:
      // https://example.com/image.jpg
      //
      // And URLs like Twitter/X:
      // https://pbs.twimg.com/media/ABC123?format=jpg&name=small
      if (isImageUrl(url)) {
        if (cancelled) return;

        setMediaUrl(url);
        setIsVideo(false);
        setIsLoading(false);
        return;
      }

      // Direct external video.
      if (isVideoUrl(url)) {
        if (cancelled) return;

        setMediaUrl(url);
        setIsVideo(true);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(url);

        if (cancelled) return;

        const contentType =
          response.headers.get('content-type')?.toLowerCase() ?? '';

        // Direct media identified by server response.
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

        // IPFS / NFT metadata JSON.
        try {
          const data = JSON.parse(text);

          // Video takes priority over image.
          if (
            typeof data.animation_url === 'string' &&
            data.animation_url
          ) {
            setMediaUrl(data.animation_url);
            setIsVideo(isVideoUrl(data.animation_url));
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
            setIsVideo(false);
            setIsLoading(false);
            return;
          }
        } catch {
          // Not JSON; continue to IPFS URL fallback.
        }

        const matches = text.match(IPFS_URL_PATTERN);

        if (matches && matches.length > 0) {
          const videoMatch = matches.find((match) =>
            isVideoUrl(match)
          );

          const imageMatch = matches.find((match) =>
            isImageUrl(match)
          );

          if (videoMatch) {
            setMediaUrl(videoMatch);
            setIsVideo(true);
            setIsLoading(false);
            return;
          }

          if (imageMatch) {
            setMediaUrl(imageMatch);
            setIsVideo(false);
            setIsLoading(false);
            return;
          }

          setMediaUrl(matches[0]);
          setIsVideo(false);
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
