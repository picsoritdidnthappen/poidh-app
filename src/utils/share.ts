import { toast } from 'react-toastify';

export function shareToX(text: string) {
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `${text}\n\n${window.location.href}`
  )}`;
  window.open(url, '_blank');
}

export function shareToFarcaster(text: string, embedImage?: string) {
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
