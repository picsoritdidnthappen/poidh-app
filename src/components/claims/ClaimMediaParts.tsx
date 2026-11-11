'use client';

import Image from 'next/image';
import { useCallback } from 'react';

import { trpc } from '@/trpc/client';
import PatternAvatar from '@/components/global/PatternAvatar';
import type { useClaimMedia } from '@/hooks/useClaimMedia';

export function hashString(value: string) {
  let hash = 0;

  for (let i = 0; i < value.length; i++) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }

  return Math.abs(hash);
}

/**
 * Image URL version of the deterministic squares.
 * Used by components that accept only an image URL,
 * such as the bounty confirmation and success modals.
 *
 * Matches the layout and colors in GenerativePlaceholder.
 */
export function getGenerativePlaceholderImageUrl(
  seed: string
): string {
  const hash = hashString(seed);

  const palette = [
    '#F45B5B',
    '#FFD166',
    '#118AB2',
    '#7B61FF',
    '#06D6A0',
    '#F4A261',
  ];

  const background = palette[hash % palette.length];
  const accent1 = palette[(hash + 2) % palette.length];
  const accent2 = palette[(hash + 4) % palette.length];

  const vertical = 28 + ((hash >> 2) % 38);
  const horizontal = 30 + ((hash >> 4) % 36);

  const smallBlockLeft = 8 + ((hash >> 6) % 58);
  const smallBlockTop = 8 + ((hash >> 8) % 58);

  // 400px SVG. Percentage positioning matches
  // the existing GenerativePlaceholder component.
  const vx = vertical * 4;
  const hy = horizontal * 4;
  const sx = smallBlockLeft * 4;
  const sy = smallBlockTop * 4;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg"
      width="400" height="400" viewBox="0 0 400 400">
      <rect width="400" height="400"
        fill="${background}"/>

      <rect x="${vx}" y="0" width="4" height="400"
        fill="#102A43"/>

      <rect x="0" y="${hy}" width="400" height="4"
        fill="#102A43"/>

      <rect x="${vx}" y="0"
        width="${400 - vx}" height="${hy}"
        fill="${accent1}"/>

      <rect x="${sx}" y="${sy}"
        width="96" height="96"
        fill="#102A43"/>

      <rect x="${sx + 4}" y="${sy + 4}"
        width="88" height="88"
        fill="${accent2}"/>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    svg
  )}`;
}


export function GenerativePlaceholder({ seed }: { seed: string }) {
  const hash = hashString(seed);

  const palette = [
    '#F45B5B',
    '#FFD166',
    '#118AB2',
    '#7B61FF',
    '#06D6A0',
    '#F4A261',
  ];

  const background = palette[hash % palette.length];
  const accent1 = palette[(hash + 2) % palette.length];
  const accent2 = palette[(hash + 4) % palette.length];

  const vertical = 28 + ((hash >> 2) % 38);
  const horizontal = 30 + ((hash >> 4) % 36);

  const smallBlockLeft = 8 + ((hash >> 6) % 58);
  const smallBlockTop = 8 + ((hash >> 8) % 58);

  return (
    <div
      className='absolute inset-0 overflow-hidden'
      style={{
        backgroundColor: background,
      }}
    >
      <div
        className='absolute top-0 bottom-0 w-[4px] bg-[#102A43]'
        style={{
          left: `${vertical}%`,
        }}
      />

      <div
        className='absolute left-0 right-0 h-[4px] bg-[#102A43]'
        style={{
          top: `${horizontal}%`,
        }}
      />

      <div
        className='absolute'
        style={{
          left: `${vertical}%`,
          top: 0,
          right: 0,
          height: `${horizontal}%`,
          backgroundColor: accent1,
        }}
      />

      <div
        className='absolute border-[4px] border-[#102A43]'
        style={{
          left: `${smallBlockLeft}%`,
          top: `${smallBlockTop}%`,
          width: '24%',
          height: '24%',
          backgroundColor: accent2,
        }}
      />
    </div>
  );
}

/*
 * A claim's photo or video, filling the nearest relative parent. Shows a
 * loading tile while useClaimMedia resolves the URL, and the generative
 * placeholder if there's no media or it fails to load.
 */
export function ClaimMedia({
  media,
  seed,
  alt,
  videoControls = true,
  mediaClassName = '',
  loadingClassName = 'bg-white/10 animate-pulse',
}: {
  media: ReturnType<typeof useClaimMedia>;
  seed: string;
  alt: string;
  // Off where the card itself is the click target (the home rails)
  videoControls?: boolean;
  // Extra classes for the image or video, e.g. a hover zoom
  mediaClassName?: string;
  loadingClassName?: string;
}) {
  const { mediaUrl, isVideo, isLoading, mediaError, setMediaError } = media;

  // Stable, so next/image doesn't reset img.src on every render
  const handleError = useCallback(() => setMediaError(true), [setMediaError]);

  if (mediaUrl && !mediaError) {
    return isVideo ? (
      <video
        src={mediaUrl}
        controls={videoControls}
        muted={!videoControls}
        playsInline
        preload='metadata'
        className={`absolute inset-0 w-full h-full object-cover ${mediaClassName}`}
        // With controls, clicks belong to the video, not the card
        onClick={videoControls ? (e) => e.stopPropagation() : undefined}
        onError={handleError}
      />
    ) : (
      <Image
        src={mediaUrl}
        alt={alt}
        fill
        unoptimized
        className={`object-cover ${mediaClassName}`}
        onError={handleError}
      />
    );
  }

  if (isLoading && !mediaError) {
    return <div className={`absolute inset-0 ${loadingClassName}`} />;
  }

  return <GenerativePlaceholder seed={seed} />;
}

export function IssuerAvatar({
  address,
  fallbackAlt,
  size = 28,
}: {
  address: string;
  fallbackAlt: string;
  size?: number;
}) {
  const userQuery = trpc.neynar.usersData.useQuery(
    {
      addresses: [address],
    },
    {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    }
  );

  const user = userQuery.data?.[0];

  if (userQuery.isLoading) {
    return (
      <div
        className='rounded-full bg-white/20 animate-pulse'
        style={{
          width: size,
          height: size,
        }}
      />
    );
  }

  if (user?.pfpUrl) {
    return (
      <div
        className='relative overflow-hidden rounded-full'
        style={{
          width: size,
          height: size,
        }}
      >
        <Image
          src={user.pfpUrl}
          alt={user.farcasterTag ?? fallbackAlt}
          fill
          unoptimized
          className='object-cover'
        />
      </div>
    );
  }

  return <PatternAvatar seed={address} size={size} />;
}
