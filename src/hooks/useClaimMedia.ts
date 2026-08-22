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

const IPFS_GATEWAY = 'https://ipfs.skatehive.app/ipfs/';

function normalizeUrl(url: string): string {
  if (url.startsWith('ipfs://')) {
    return `${IPFS_GATEWAY}${url.slice(7)}`;
  }

  return url;
}

function isImageUrl(url: string): boolean {
  return IMAGE_EXTENSIONS.test(url) || IMAGE_FORMAT_PARAM.test(url);
}

function isVideoUrl(url: string): boolean {
  return VIDEO_EXTENSIONS.test(url) || VIDEO_FORMAT_PARAM.test(url);
}

type MediaResult = {
  mediaUrl: string | null;
  isVideo: boolean;
};

async function resolveMediaUrl(
  inputUrl: string,
  depth = 0
): Promise<MediaResult> {
  if (depth > 3) {
    return {
      mediaUrl: null,
      isVideo: false,
    };
  }

  const url = normalizeUrl(inputUrl);

  // Direct image URL.
  // Also handles URLs such as:
  // https://pbs.twimg.com/media/ABC123?format=jpg&name=small
  if (isImageUrl(url)) {
    return {
      mediaUrl: url,
      isVideo: false,
    };
  }

  // Direct video URL.
  if (isVideoUrl(url)) {
    return {
      mediaUrl: url,
      isVideo: true,
    };
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return {
        mediaUrl: null,
        isVideo: false,
      };
    }

    const contentType =
      response.headers.get('content-type')?.toLowerCase() ?? '';

    // Extensionless direct image.
    if (contentType.startsWith('image/')) {
      return {
        mediaUrl: url,
        isVideo: false,
      };
    }

    // Extensionless direct video.
    if (contentType.startsWith('video/')) {
      return {
        mediaUrl: url,
        isVideo: true,
      };
    }

    const text = await response.text();

    // NFT metadata.
    try {
      const data = JSON.parse(text);

      // Standard NFT video field.
      if (
        typeof data.animation_url === 'string' &&
        data.animation_url
      ) {
        return resolveMediaUrl(data.animation_url, depth + 1);
      }

      // Additional video field support.
      if (
        typeof data.video === 'string' &&
        data.video
      ) {
        return resolveMediaUrl(data.video, depth + 1);
      }

      // Standard NFT image field.
      //
      // Resolve recursively because the value itself could be:
      // - a jpg/png
      // - a Twitter image
      // - an IPFS URI
      // - a video URL
      if (
        typeof data.image === 'string' &&
        data.image
      ) {
        return resolveMediaUrl(data.image, depth + 1);
      }
    } catch {
      // Not JSON. Fall through to URL extraction.
    }

    const matches = text.match(IPFS_URL_PATTERN);

    if (matches?.length) {
      return resolveMediaUrl(matches[0], depth + 1);
    }

    return {
      mediaUrl: null,
      isVideo: false,
    };
  } catch {
    return {
      mediaUrl: null,
      isVideo: false,
    };
  }
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

    const resolve = async () => {
      setIsLoading(true);
      setMediaError(false);
      setMediaUrl(null);
      setIsVideo(false);

      const result = await resolveMediaUrl(url);

      if (cancelled) {
        return;
      }

      if (result.mediaUrl) {
        setMediaUrl(result.mediaUrl);
        setIsVideo(result.isVideo);
        setMediaError(false);
      } else {
        setMediaUrl(null);
        setIsVideo(false);
        setMediaError(true);
      }

      setIsLoading(false);
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
