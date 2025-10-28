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
    return `${baseUrl}/api/og/${type}?data=${encodeURIComponent(
      JSON.stringify(dataObject)
    )}&imageFormat=${imageFormat}`;
  } else {
    return `${baseUrl}/api/og/${type}?${new URLSearchParams(
      dataObject
    ).toString()}&imageFormat=${imageFormat}`;
  }
}
