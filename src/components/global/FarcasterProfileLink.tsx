'use client';

import sdk from '@farcaster/frame-sdk';
import { sdk as miniAppSdk } from '@farcaster/miniapp-sdk';
import { FARCASTER_URL } from './SocialMediaLinks';

interface FarcasterProfileLinkProps {
  farcasterTag: string;
  farcasterFid?: number | null;
  className?: string;
  'aria-label'?: string;
  children: React.ReactNode;
}

export default function FarcasterProfileLink({
  farcasterTag,
  farcasterFid,
  className,
  'aria-label': ariaLabel,
  children,
}: FarcasterProfileLinkProps) {
  const handleClick = async (e: React.MouseEvent) => {
    if (farcasterFid == null) return;
    e.preventDefault();
    const isMiniApp = await sdk.isInMiniApp();
    if (isMiniApp) {
      await miniAppSdk.actions.viewProfile({ fid: farcasterFid });
    } else {
      window.open(
        `${FARCASTER_URL}/${farcasterTag}`,
        '_blank',
        'noopener,noreferrer'
      );
    }
  };

  return (
    <a
      href={`${FARCASTER_URL}/${farcasterTag}`}
      target='_blank'
      rel='noopener noreferrer'
      className={className}
      aria-label={ariaLabel}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
