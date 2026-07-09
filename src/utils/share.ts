import { toast } from 'react-toastify';
import { sdk } from '@farcaster/miniapp-sdk';
import {
  FARCASTER_URL,
  TWITTER_URL,
} from '@/components/global/SocialMediaLinks';
import { UserData } from '@/utils/types';

export function shareToTwitter(text: string, url?: string) {
  const nonCashedUrl = `${url ?? window.location.href}?t=${Math.floor(
    Date.now() / 1000
  )}`;
  const composeUrl = `${TWITTER_URL}/intent/tweet?text=${encodeURIComponent(
    `${text}\n\n${nonCashedUrl}`
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
  if (platform === 'farcaster' && user?.farcasterTag) {
    return `@${user.farcasterTag}`;
  } else if (platform === 'twitter' && user?.twitterTag) {
    return `@${user.twitterTag}`;
  }
  if (user?.gwei) {
    return user.gwei;
  }
  if (user?.wei) {
    return user.wei;
  }
  if (user?.ens) {
    return user.ens;
  }
  if (user?.degenName) {
    return user.degenName;
  }
  return `${user?.address.slice(0, 7)}`;
}
