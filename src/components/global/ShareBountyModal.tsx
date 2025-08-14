'use client';

import { useEffect } from 'react';
import {
  TwitterXIcon,
  FarcasterIcon,
  CopyIcon,
} from '@/components/global/Icons';
import { toast } from 'react-toastify';
import { trpc } from '@/trpc/client';
import { sdk } from '@farcaster/miniapp-sdk';
import { useScreenSize } from '@/hooks/useScreenSize';

export default function ShareBountModal({
  bountyIssuerAddress,
  onClose,
}: {
  onClose: () => void;
  bountyIssuerAddress: string;
}) {
  const isMobile = useScreenSize();
  const { data: userDataNeynar, refetch: fetchUserData } =
    trpc.usersDataNeynar.useQuery(
      { addresses: [bountyIssuerAddress] },
      {
        enabled: false,
        staleTime: Infinity,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      }
    );

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [onClose]);

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      toast.success('Bounty link copied to clipboard!');
      onClose();
    });
  };

  const handleShareX = async () => {
    let text =
      'check out this bounty on @poidhxyz 📸\n\n' + window.location.href;

    let neynarData = userDataNeynar;
    if (!neynarData) {
      const { data } = await fetchUserData();
      neynarData = data;
    }
    if (neynarData && neynarData[bountyIssuerAddress]?.[0]) {
      const xUsername = neynarData?.[
        bountyIssuerAddress
      ]?.[0]?.verified_accounts?.find(
        (account) => account.platform === 'x'
      )?.username;
      if (xUsername) {
        text =
          'check out this bounty from @' +
          xUsername +
          ' on @poidhxyz 📸\n\n' +
          window.location.href;
      }
    }
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      '_blank'
    );
    onClose();
  };

  const handleShareFarcaster = async () => {
    let text = 'check out this bounty on /poidh 📸\n';

    let neynarData = userDataNeynar;
    if (!neynarData) {
      const { data } = await fetchUserData();
      neynarData = data;
    }
    if (neynarData && neynarData[bountyIssuerAddress]?.[0]?.username) {
      text =
        'check out this bounty from @' +
        neynarData?.[bountyIssuerAddress]?.[0]?.username +
        ' on /poidh 📸\n\n';
    }

    const isMiniApp = await sdk.isInMiniApp();
    if (isMobile && isMiniApp) {
      await sdk.actions.composeCast({
        text,
        embeds: [window.location.href],
      });
    } else {
      window.open(
        `https://warpcast.com/~/compose?text=${encodeURIComponent(
          text
        )}&embeds[]=${encodeURIComponent(window.location.href)}`,
        '_blank'
      );
    }
    onClose();
  };

  const shareOptions = [
    {
      name: 'X (Twitter)',
      icon: <TwitterXIcon width={24} height={24} />,
      handler: handleShareX,
      description: 'Share on X',
    },
    {
      name: 'Farcaster',
      icon: <FarcasterIcon width={24} height={24} />,
      handler: handleShareFarcaster,
      description: 'Share on Farcaster',
    },
    {
      name: 'Copy Link',
      icon: <CopyIcon width={24} height={24} />,
      handler: handleCopyLink,
      description: 'Copy link to clipboard',
    },
  ];

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className='fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4'
      onClick={handleBackdropClick}
    >
      <div className='bg-poidhBlue/90 border border-[#D1ECFF] rounded-[30px] shadow-2xl w-full max-w-sm mx-auto transform transition-all'>
        <div className='flex items-center justify-between p-6 border-b border-white/20'>
          <h2 className='text-xl font-semibold text-white'>
            Share this bounty
          </h2>
          <button
            onClick={onClose}
            className='p-2 hover:bg-white/20 rounded-full transition-colors text-white'
          >
            <svg
              width='20'
              height='20'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <path d='M18 6L6 18M6 6l12 12' />
            </svg>
          </button>
        </div>

        <div className='p-6'>
          <div className='flex flex-col gap-3'>
            {shareOptions.map((option) => (
              <button
                key={option.name}
                onClick={option.handler}
                className='flex items-center gap-4 p-4 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 transition-all group w-full text-left'
              >
                <div className='text-white group-hover:text-white transition-colors'>
                  {option.icon}
                </div>
                <span className='text-base font-medium text-white group-hover:text-white transition-colors'>
                  {option.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className='px-6 pb-6'>
          <p className='text-sm text-white/70 text-center'>
            Help spread the word about this bounty!
          </p>
        </div>
      </div>
    </div>
  );
}
