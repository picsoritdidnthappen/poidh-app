import { useEffect, useState } from 'react';

const VIDEO_EXTENSIONS = /\.(mp4|mov|webm|ogg)(\?.*)?$/i;

const IPFS_URL_PATTERN = /https?:\/\/[^\s"]+\/ipfs\/[a-zA-Z0-9]+[^\s"]*/g;

type ResolvedClaimMedia = {
  mediaUrl: string;
  isVideo: boolean;
} | null;

/*
 * Resolutions are shared by URL, so the same claim rendered more than once
 * (e.g. a hero polaroid coming round again) only sniffs its media once. Failures
 * are evicted so a later mount can retry.
 */
const resolvedMedia = new Map<string, Promise<ResolvedClaimMedia>>();
const settledMedia = new Map<string, ResolvedClaimMedia>();

async function sniffClaimMedia(url: string): Promise<ResolvedClaimMedia> {
  const response = await fetch(url);

  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.startsWith('video/') || VIDEO_EXTENSIONS.test(url)) {
    return { mediaUrl: url, isVideo: true };
  }

  if (contentType.startsWith('image/')) {
    return { mediaUrl: url, isVideo: false };
  }

  const text = await response.text();

  try {
    const data = JSON.parse(text);

    if (typeof data.image === 'string' && data.image.trim()) {
      const resolvedImage = data.image.trim();

      return {
        mediaUrl: resolvedImage,
        isVideo: VIDEO_EXTENSIONS.test(resolvedImage),
      };
    }
  } catch {
    // Not JSON — continue checking
    // the response for embedded IPFS URLs.
  }

  const matches = text.match(IPFS_URL_PATTERN);

  if (matches && matches.length > 0) {
    const videoMatch = matches.find((match) => VIDEO_EXTENSIONS.test(match));

    return {
      mediaUrl: videoMatch ?? matches[0],
      isVideo: !!videoMatch,
    };
  }

  return null;
}

function resolveClaimMedia(url: string) {
  let pending = resolvedMedia.get(url);

  if (!pending) {
    pending = sniffClaimMedia(url).then(
      (media) => {
        settledMedia.set(url, media);
        return media;
      },
      () => {
        resolvedMedia.delete(url);
        return null;
      }
    );
    resolvedMedia.set(url, pending);
  }

  return pending;
}

const PRELOAD_TIMEOUT_MS = 8000;

/*
 * Resolves a claim's media and, for images, fetches and decodes it, so a
 * later mount paints it straight away. Never rejects, and gives up after
 * PRELOAD_TIMEOUT_MS so a slow host can't hold up the caller.
 */
export function preloadClaimMedia(url: string) {
  const normalizedUrl = url.trim();

  if (!normalizedUrl) {
    return Promise.resolve();
  }

  const loaded = resolveClaimMedia(normalizedUrl).then(async (media) => {
    if (!media || media.isVideo) {
      return;
    }

    const image = new window.Image();
    image.src = media.mediaUrl;

    await image.decode().catch(() => undefined);
  });

  return Promise.race([
    loaded,
    new Promise<void>((resolve) => setTimeout(resolve, PRELOAD_TIMEOUT_MS)),
  ]);
}

export function useClaimMedia(url: string | null | undefined, enabled = true) {
  // Start from an already-resolved result, if any, to skip the loading frame.
  const [settled] = useState(() =>
    typeof url === 'string' ? settledMedia.get(url.trim()) : undefined
  );

  const [mediaUrl, setMediaUrl] = useState<string | null>(
    settled?.mediaUrl ?? null
  );

  const [isVideo, setIsVideo] = useState(settled?.isVideo ?? false);

  const [isLoading, setIsLoading] = useState(settled === undefined);

  const [mediaError, setMediaError] = useState(settled === null);

  useEffect(() => {
    const normalizedUrl = typeof url === 'string' ? url.trim() : '';

    const apply = (media: ResolvedClaimMedia) => {
      setMediaUrl(media?.mediaUrl ?? null);
      setIsVideo(media?.isVideo ?? false);
      setIsLoading(false);
      setMediaError(!media);
    };

    /*
     * An empty URI is not something we need to resolve.
     *
     * Treat it exactly like failed/invalid media so every
     * consumer can immediately render its geometric fallback
     * instead of getting stuck in a loading state forever.
     */
    if (!normalizedUrl) {
      apply(null);
      return;
    }

    // Already resolved elsewhere: show it without a loading flash.
    if (settledMedia.has(normalizedUrl)) {
      apply(settledMedia.get(normalizedUrl) ?? null);
      return;
    }

    setMediaUrl(null);
    setIsVideo(false);
    setIsLoading(true);
    setMediaError(false);

    /*
     * Allows callers to defer
     * media resolution until the thumbnail is near/in view.
     */
    if (!enabled) {
      return;
    }

    let cancelled = false;

    resolveClaimMedia(normalizedUrl).then((media) => {
      if (!cancelled) {
        apply(media);
      }
    });

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
