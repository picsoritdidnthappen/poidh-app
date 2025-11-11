import { toast } from 'react-toastify';
import { sdk } from '@farcaster/miniapp-sdk';
import { getEnsOrDegenName } from '@/utils/web3';

export function shareToX(text: string) {
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `${text}\n\n${window.location.href}`
  )}`;
  window.open(url, '_blank');
}

export async function shareToFarcaster(text: string, embedImage?: string) {
  const isMiniApp = await sdk.isInMiniApp();
  const isMobile = window.innerWidth < 768;
  if (isMobile && isMiniApp) {
    if (embedImage) {
      await sdk.actions.composeCast({
        text,
        embeds: [window.location.href, embedImage] as [string, string],
      });
    } else {
      await sdk.actions.composeCast({
        text,
        embeds: [window.location.href] as [string],
      });
    }
    return;
  }
  const url = `https://warpcast.com/~/compose?text=${encodeURIComponent(
    text
  )}&embeds[]=${encodeURIComponent(window.location.href)}${
    embedImage ? `&embeds[]=${encodeURIComponent(embedImage)}` : ''
  }`;
  window.open(url, '_blank');
}

export function copyToClipboard(successMessage: string) {
  navigator.clipboard.writeText(window.location.href).then(() => {
    toast.success(successMessage);
  });
}

export async function getAddressDisplayName(
  address: string,
  platform: 'farcaster' | 'twitter',
  usersDataNeynar?: Record<string, any[]>
): Promise<string> {
  const userData = usersDataNeynar?.[address.toLowerCase()]?.[0];

  if (platform === 'farcaster') {
    if (userData?.username) {
      return `@${userData.username}`;
    }
  } else if (platform === 'twitter') {
    const xUsername = userData?.verified_accounts?.find(
      (account: any) => account.platform === 'x'
    )?.username;
    if (xUsername) {
      return `@${xUsername}`;
    }
  }

  try {
    const ensOrDegenName = await getEnsOrDegenName({
      chainName: 'base',
      address,
    });

    if (ensOrDegenName) {
      return ensOrDegenName;
    }
  } catch (error) {
    console.warn('Failed to fetch ENS/Degen name:', error);
  }

  return `${address.slice(0, 7)}`;
}
