type OpenGraphType = {
  siteName: string;
  description: string;
  templateTitle?: string;
  logo?: string;
};

export function openGraph({
  siteName,
  templateTitle,
  description,
  logo = 'https://og.<your-domain>/images/logo.jpg',
}: OpenGraphType): string {
  const ogLogo = encodeURIComponent(logo);
  const ogSiteName = encodeURIComponent(siteName.trim());
  const ogTemplateTitle = templateTitle
    ? encodeURIComponent(templateTitle.trim())
    : undefined;
  const ogDesc = encodeURIComponent(description.trim());

  return `https://og.<your-domain>/api/general?siteName=${ogSiteName}&description=${ogDesc}&logo=${ogLogo}${
    ogTemplateTitle ? `&templateTitle=${ogTemplateTitle}` : ''
  }`;
}

export function generateDynamicOGUrl({
  type,
  dataObject,
}: {
  type: 'bounty' | 'account';
  dataObject: Record<string, string>;
}): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://poidh.xyz';
  return `${appUrl}/api/og/${type}?${new URLSearchParams(
    dataObject
  ).toString()}`;
}
