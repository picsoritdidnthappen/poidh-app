import { chains } from '@/utils/config';

/*
 * Known poidh protocol contracts, built from the chain config so the
 * addresses can't drift from the ones the app actually calls.
 *
 * These may legitimately appear as claim NFT owners, but they should
 * never be represented as social users or included in relatedUsers.
 */
const POIDH_PROTOCOL_CONTRACTS = new Map<string, string>(
  Object.values(chains).flatMap(({ slug, contracts }) => {
    const prefix = slug === 'degen' ? 'historical poidh Degen' : 'poidh';
    const core = slug === 'degen' ? 'core' : 'v3 core';
    return [
      [contracts.mainContract.toLowerCase(), `${prefix} ${core} contract`],
      [contracts.nftContract.toLowerCase(), `${prefix} claim NFT contract`],
    ];
  })
);

/** Returns a label for a poidh protocol contract, or null for anyone else. */
export function getProtocolContractLabel(address: string): string | null {
  return POIDH_PROTOCOL_CONTRACTS.get(address.toLowerCase()) ?? null;
}
