const INTERNAL_HOSTS = new Set([
  'poidh.xyz',
  'staging.poidh.xyz',
]);

export type LinkInfo = {
  href: string;
  destination: string;
  hostname: string;
  isExternal: boolean;
};

export function inspectLink(
  href: string | null | undefined
): LinkInfo | null {
  if (!href || !href.trim()) return null;

  const cleaned = href.trim();

  try {
    const url = new URL(cleaned, 'https://poidh.xyz');

    // Do not permit script, data, file, or other unsafe
    // URL schemes through user-generated web links.
    if (
      url.protocol !== 'https:' &&
      url.protocol !== 'http:'
    ) {
      return null;
    }

    // Reject URLs that embed credentials, which can
    // make phishing destinations harder to recognize.
    if (url.username || url.password) return null;

    const isExternal = !INTERNAL_HOSTS.has(
      url.hostname.toLowerCase()
    );

    return {
      href: cleaned,
      destination: url.href,
      hostname: url.host,
      isExternal,
    };
  } catch {
    return null;
  }
}

export function getLinkRel(
  href: string | null | undefined,
  userGenerated = false
): string {
  const info = inspectLink(href);

  if (!info?.isExternal) {
    return 'noopener noreferrer';
  }

  return userGenerated
    ? 'noopener noreferrer nofollow ugc'
    : 'noopener noreferrer nofollow';
}
