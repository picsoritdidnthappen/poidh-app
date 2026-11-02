export type DraftPublication = {
  title: string;
  description: string;
  amount: string;
  chain: 'mainnet' | 'base' | 'arbitrum';
  isOpenBounty: boolean;
  album: string;
};

/** The same deterministic message must be used for signing and verification. */
export function getDraftPublishMessage({
  site,
  creator,
  nonce,
  draft,
}: {
  site: string;
  creator: string;
  nonce: string;
  draft: DraftPublication;
}): string {
  return [
    'poidh: publish public bounty draft',
    `Site: ${site}`,
    `Creator: ${creator.toLowerCase()}`,
    `Nonce: ${nonce}`,
    '',
    'Draft JSON:',
    JSON.stringify({
      title: draft.title,
      description: draft.description,
      amount: draft.amount,
      chain: draft.chain,
      isOpenBounty: draft.isOpenBounty,
      album: draft.album,
    }),
    '',
    'I authorize publishing this draft on IPFS and listing it in the public poidh activity feed.',
    'This signature does not create or fund an onchain bounty.',
  ].join('\n');
}
