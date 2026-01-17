import { toast } from 'react-toastify';
import { sdk } from '@farcaster/miniapp-sdk';
import {
  FARCASTER_URL,
  TWITTER_URL,
} from '@/components/global/SocialMediaLinks';
import { UserData } from '@/utils/types';

export function shareToTwitter(text: string, url?: string) {
  const composeUrl = `${TWITTER_URL}/intent/tweet?text=${encodeURIComponent(
    `${text}\n\n${url ?? window.location.href}`
  )}`;
  window.open(composeUrl, '_blank');
}

export async function shareToFarcaster({
  text,
  url,
  embedImage,
}: {
  text: string;
  url?: string;
  embedImage?: string;
}) {
  const isMiniApp = await sdk.isInMiniApp();
  const isMobile = window.innerWidth < 768;
  if (isMobile && isMiniApp) {
    let embeds;
    if (embedImage) {
      embeds = [url ?? window.location.href, embedImage] as [string, string];
    } else {
      embeds = [url ?? window.location.href] as [string];
    }
    await sdk.actions.composeCast({
      text,
      embeds,
    });
    return;
  }

  const composeUrl = `${FARCASTER_URL}/~/compose?text=${encodeURIComponent(
    text
  )}&embeds[]=${encodeURIComponent(url ?? window.location.href)}${
    embedImage ? `&embeds[]=${encodeURIComponent(embedImage)}` : ''
  }`;
  window.open(composeUrl, '_blank');
}

export function copyToClipboard(successMessage: string) {
  navigator.clipboard.writeText(window.location.href).then(() => {
    toast.success(successMessage);
  });
}

export function getDisplayUsername(
  user: UserData,
  platform: 'farcaster' | 'twitter'
): string {
  if (!user) {
    return 'unknown';
  }
  if (platform === 'farcaster' && user?.farcaster_tag) {
    return `@${user.farcaster_tag}`;
  } else if (platform === 'twitter' && user?.twitter_tag) {
    return `@${user.twitter_tag}`;
  }
  if (user?.ens) {
    return user.ens;
  }
  if (user?.degen_name) {
    return user.degen_name;
  }
  return `${user?.address.slice(0, 7)}`;
}
