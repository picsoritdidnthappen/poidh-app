import { useEffect, useState } from 'react';

const VIDEO_EXTENSIONS = /\.(mp4|mov|webm|ogg)(\?.*)?$/i;

const IPFS_URL_PATTERN = /https?:\/\/[^\s"]+\/ipfs\/[a-zA-Z0-9]+[^\s"]*/g;

type ResolvedClaimMedia = {
  mediaUrl: string;
  isVideo: boolean;
} | null;

/*
 * A claim that ends up without usable media can get there in three very
 * different ways: the browser blocked the fetch (CORS or network), the host
 * answered with an HTTP error, or the response simply carried no image.
 * Consumers render the same fallback for all three, but claimants debugging
 * from their own origin need the distinction, so failures keep their reason.
 */
export type MediaFailureReason = 'network' | 'http' | 'no-media';

/*
 * Resolutions are shared by URL, so the same claim rendered more than once
 * (e.g. in a home rail and a bounty card) only sniffs its media once. Failures
 * are evicted so a later mount can retry.
 */
const resolvedMedia = new Map<string, Promise<ResolvedClaimMedia>>();
const settledMedia = new Map<string, ResolvedClaimMedia>();
const failedMedia = new Map<string, MediaFailureReason>();

async function sniffClaimMedia(url: string): Promise<ResolvedClaimMedia> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load claim media: ${response.status}`);
  }

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
        resolvedMedia.delete(url);
        if (media === null) {
          failedMedia.set(url, 'no-media');
        } else {
          failedMedia.delete(url);
        }
        settledMedia.set(url, media);
        return media;
      },
      (error) => {
        // CORS rejections surface as TypeError from fetch; other rejects come
        // from sniffClaimMedia's !response.ok branch (an HTTP failure).
        const reason: MediaFailureReason =
          error instanceof TypeError ? 'network' : 'http';
        resolvedMedia.delete(url);
        failedMedia.set(url, reason);
        console.warn(`[claim media] ${url} could not be resolved (${reason})`);
        return null;
      }
    );
    resolvedMedia.set(url, pending);
  }

  return pending;
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

  const [mediaFailure, setMediaFailure] = useState<MediaFailureReason | null>(
    settled === null ? (failedMedia.get(url?.trim() ?? '') ?? 'no-media') : null
  );

  useEffect(() => {
    const normalizedUrl = typeof url === 'string' ? url.trim() : '';

    const apply = (media: ResolvedClaimMedia) => {
      setMediaUrl(media?.mediaUrl ?? null);
      setIsVideo(media?.isVideo ?? false);
      setIsLoading(false);
      setMediaError(!media);
      setMediaFailure(
        media === null
          ? (failedMedia.get(normalizedUrl) ?? 'no-media')
          : null
      );
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
    setMediaFailure(null);

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
    mediaFailure,
    setMediaError,
  };
}
