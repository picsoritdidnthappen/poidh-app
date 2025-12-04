'use client';

import {
  TwitterXIcon,
  FarcasterIcon,
  CopyIcon,
} from '@/components/global/Icons';
import { useAccount } from 'wagmi';
import ShareModal from '@/components/global/ShareModal';
import { copyToClipboard, shareToFarcaster, shareToX } from '@/utils/share';

export default function ShareAccountModal({
  address,
  onClose,
}: {
  address: string;
  onClose: () => void;
}) {
  const account = useAccount();

  const isConnectectedUser =
    address.toLowerCase() === account.address?.toLowerCase();

  const handleCopyLink = () => {
    copyToClipboard('Account link copied to clipboard!');
    onClose();
  };

  const handleShareX = async () => {
    const text = `check out ${
      isConnectectedUser ? 'my' : 'this'
    } account on @poidhxyz 📸`;
    shareToX(text);
    onClose();
  };

  const handleShareFarcaster = async () => {
    const text = `check out ${
      isConnectectedUser ? 'my' : 'this'
    } account on /poidh 📸\n`;
    await shareToFarcaster({ text });
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
      icon: <FarcasterIcon size={24} />,
      handler: handleShareFarcaster,
      description: 'Share on Farcaster',
    },
    {
      name: 'Copy Link',
      icon: <CopyIcon size={24} />,
      handler: handleCopyLink,
      description: 'Copy link to clipboard',
    },
  ];

  return (
    <ShareModal
      title='Share this account'
      onClose={onClose}
      options={shareOptions.map((o) => ({
        name: o.name,
        icon: o.icon,
        onClick: o.handler,
        description: o.description,
      }))}
      footerText='Get the word out about this account!'
    />
  );
}
