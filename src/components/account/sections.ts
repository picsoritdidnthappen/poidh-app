// Shared by AccountInfo and the server page, so both build the same query inputs
export type Section = 'nfts' | 'bounties' | 'claims';
export const PAGE_SIZE = 9;

export const getSectionFromParam = (
  value: string | null | undefined
): Section => {
  if (value === 'nfts' || value === 'bounties' || value === 'claims') {
    return value;
  }
  return 'bounties';
};
