import { toast } from 'react-toastify';
import { sdk } from '@farcaster/miniapp-sdk';
import { getEnsOrDegenName } from '@/utils/web3';
import {
  FARCASTER_URL,
  TWITTER_URL,
} from '@/components/global/SocialMediaLinks';
import { inferRouterOutputs } from '@trpc/server';
import { type AppRouter } from '@/trpc/trpc';
import { tryCatchAsync } from './utils';

type UserDataNeynar =
  inferRouterOutputs<AppRouter>['neynar']['usersData'][number];

export function shareToX(text: string, url?: string) {
  const composeUrl = `${TWITTER_URL}/intent/tweet?text=${encodeURIComponent(
    `${text}\n\n${url ?? window.location.href}`
  )}`;
  window.open(composeUrl, '_blank');
}

export async function shareToFarcaster(
  text: string,
  url?: string,
  embedImage?: string
) {
  const isMiniApp = await sdk.isInMiniApp();
  const isMobile = window.innerWidth < 768;
  if (isMobile && isMiniApp) {
    if (embedImage) {
      await sdk.actions.composeCast({
        text,
        embeds: [url ?? window.location.href, embedImage] as [string, string],
      });
    } else {
      await sdk.actions.composeCast({
        text,
        embeds: [url ?? window.location.href] as [string],
      });
    }
    return;
  }

  const composeUrl = `${FARCASTER_URL}/~/compose?text=${encodeURIComponent(
    text
  )}&embeds[]=${encodeURIComponent(window.location.href)}${
    embedImage ? `&embeds[]=${encodeURIComponent(embedImage)}` : ''
  }`;
  window.open(composeUrl, '_blank');
}

export function copyToClipboard(successMessage: string) {
  navigator.clipboard.writeText(window.location.href).then(() => {
    toast.success(successMessage);
  });
}

export async function getAddressDisplayName(
  address: string,
  platform: 'farcaster' | 'twitter',
  user?: UserDataNeynar
): Promise<string> {
  let displayName = `${address.slice(0, 7)}`;

  if (platform === 'farcaster') {
    if (user?.farcaster_tag) {
      displayName = `@${user.farcaster_tag}`;
    }
  } else if (platform === 'twitter') {
    if (user?.twitter_tag) {
      displayName = `@${user.twitter_tag}`;
    }
  }

  const [name, error] = await tryCatchAsync(
    async () =>
      await getEnsOrDegenName({
        chainName: 'base',
        address,
      })
  );

  if (error) {
    console.warn('Failed to fetch ENS/Degen name:', error);
    return displayName;
  }

  return name ?? displayName;
}
