import { toast } from 'react-toastify';
import { sdk } from '@farcaster/miniapp-sdk';
import {
  FARCASTER_URL,
  TWITTER_URL,
} from '@/components/global/SocialMediaLinks';
import { inferRouterOutputs } from '@trpc/server';
import { type AppRouter } from '@/trpc/trpc';
import { trpc } from '@/trpc/client';

type UserDataNeynar =
  inferRouterOutputs<AppRouter>['neynar']['usersData'][number];

export function shareToX(text: string, url?: string) {
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

export async function getAddressDisplayName(
  address: string,
  platform: 'farcaster' | 'twitter',
  user?: UserDataNeynar
): Promise<string> {
  if (platform === 'farcaster' && user?.farcaster_tag) {
    return `@${user.farcaster_tag}`;
  } else if (platform === 'twitter' && user?.twitter_tag) {
    return `@${user.twitter_tag}`;
  }

  const ensOrDegenName = await trpc.web3.fetchEnsOrDegenName.useQuery({
    address,
  });
  return ensOrDegenName.data ?? `${address.slice(0, 7)}`;
}
