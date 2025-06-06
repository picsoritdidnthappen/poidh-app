'use client';

import { ShareIcon } from '@/components/global/Icons';
import { useScreenSize } from '@/hooks/useScreenSize';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

export default function ShareButton({
  url,
  title,
  size = 20,
}: {
  url: string;
  title?: string;
  size?: number;
}) {
  const isMobile = useScreenSize();
  const [isSharing, setIsSharing] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(
      typeof navigator !== 'undefined' && 'share' in navigator && isMobile
    );
  }, [isMobile]);

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);

    try {
      // Check if native sharing is available (mobile browsers)
      if (canShare) {
        await navigator.share({
          title: title || 'Check out this bounty',
          url: url,
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard');
      }
    } catch (error) {
      // If user cancelled native share, don't fallback to clipboard
      if (error instanceof Error && error.name === 'AbortError') {
        // User cancelled the share - do nothing
        return;
      }

      // For other errors, try clipboard as fallback
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard');
      } catch (clipboardError) {
        toast.error('Failed to share');
      }
    } finally {
      setTimeout(() => setIsSharing(false), 1000);
    }
  };

  return (
    <button
      onClick={handleShare}
      disabled={isSharing}
      className='cursor-pointer hover:text-gray-200 shrink-0 p-2'
      title={canShare ? 'Share' : 'Copy link'}
    >
      <ShareIcon width={size} height={size} />
    </button>
  );
}
