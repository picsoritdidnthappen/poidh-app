import { toast } from 'react-toastify';

export function shareToX(text: string) {
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    text
  )}`;
  window.open(url, '_blank');
}

export function shareToFarcaster(text: string, embedUrl?: string) {
  const base = `https://warpcast.com/~/compose?text=${encodeURIComponent(
    text
  )}`;
  const finalUrl = embedUrl
    ? `${base}&embeds[]=${encodeURIComponent(embedUrl)}`
    : base;
  window.open(finalUrl, '_blank');
}

export function copyToClipboard(successMessage: string) {
  navigator.clipboard.writeText(window.location.href).then(() => {
    toast.success(successMessage);
  });
}
