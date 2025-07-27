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
  imageFormat = 'og',
  dataObject,
}: {
  type: 'bounty' | 'account';
  imageFormat?: 'og' | 'preview';
  dataObject: any;
}): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://poidh.xyz';

  if (type === 'bounty') {
    return `${baseUrl}/api/og/bounty/v2?data=${encodeURIComponent(
      JSON.stringify(dataObject)
    )}&imageFormat=${imageFormat}`;
  } else {
    return `${baseUrl}/api/og/account?${new URLSearchParams(
      dataObject
    ).toString()}&imageFormat=${imageFormat}`;
  }
}
