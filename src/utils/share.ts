import { toast } from 'react-toastify';
import { sdk } from '@farcaster/miniapp-sdk';

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
