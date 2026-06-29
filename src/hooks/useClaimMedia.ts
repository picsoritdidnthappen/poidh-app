import { useState, useEffect } from 'react';

const VIDEO_EXTENSIONS = /\.(mp4|mov|webm|ogg)(\?.*)?$/i;
const IPFS_URL_PATTERN = /https?:\/\/[^\s"]+\/ipfs\/[a-zA-Z0-9]+[^\s"]*/g;

export function useClaimMedia(url: string | null | undefined) {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mediaError, setMediaError] = useState(false);

  useEffect(() => {
    if (!url || typeof url !== 'string') return;

    const resolve = async () => {
      setIsLoading(true);
      setMediaError(false);

      try {
        const response = await fetch(url);
        const contentType = response.headers.get('content-type') ?? '';

        if (contentType.startsWith('video/') || VIDEO_EXTENSIONS.test(url)) {
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
        try {
          const data = JSON.parse(text);
          if (data.image) {
            setMediaUrl(data.image);
            setIsVideo(VIDEO_EXTENSIONS.test(data.image));
            setIsLoading(false);
            return;
          }
        } catch {
          // not JSON, fall through
        }

        const matches = text.match(IPFS_URL_PATTERN);
        if (matches && matches.length > 0) {
          const videoMatch = matches.find((m) => VIDEO_EXTENSIONS.test(m));
          const chosen = videoMatch ?? matches[0];
          setMediaUrl(chosen);
          setIsVideo(!!videoMatch);
          setIsLoading(false);
          return;
        }

        setMediaError(true);
        setIsLoading(false);
      } catch {
        setMediaError(true);
        setIsLoading(false);
      }
    };

    resolve();
  }, [url]);

  return { mediaUrl, isVideo, isLoading, mediaError };
}
