'use client';

import {
  TwitterXIcon,
  FarcasterIcon,
  CopyIcon,
} from '@/components/global/Icons';
import { trpc } from '@/trpc/client';
import ShareModal from '@/components/global/ShareModal';
import { copyToClipboard, shareToFarcaster, shareToX } from '@/utils/share';

export default function ShareBountyModal({
  bountyIssuerAddress,
  onClose,
}: {
  onClose: () => void;
  bountyIssuerAddress: string;
}) {
  const usersQuery = trpc.neynar.usersData.useQuery(
    { addresses: [bountyIssuerAddress] },
    {
      enabled: false,
      staleTime: Infinity,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  );

  const user = usersQuery.data?.find(
    (user) =>
      bountyIssuerAddress.toLocaleLowerCase() ===
      user.address.toLocaleLowerCase()
  );

  const handleShareX = async () => {
    let text = `check out this bounty on @poidhxyz 📸\n\n${window.location.href}`;

    if (user) {
      if (user?.twitter_tag) {
        text = `check out this bounty from @${user.twitter_tag} on @poidhxyz 📸 \n`;
      }
    }
    shareToX(text);
    onClose();
  };

  const handleShareFarcaster = async () => {
    let text = 'check out this bounty on /poidh 📸\n';

    if (user?.farcaster_tag) {
      text = `check out this bounty from @${user.farcaster_tag} on /poidh 📸\n`;
    }

    await shareToFarcaster({ text });
    onClose();
  };

  const handleCopyLink = () => {
    copyToClipboard('Bounty link copied to clipboard!');
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
      title='Share this bounty'
      onClose={onClose}
      options={shareOptions.map((o) => ({
        name: o.name,
        icon: o.icon,
        onClick: o.handler,
        description: o.description,
      }))}
      footerText='Help spread the word about this bounty!'
    />
  );
}
