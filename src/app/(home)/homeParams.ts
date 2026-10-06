import { BountyDisplayType, BountySortType } from '@/utils/types';

// Shared by the server page and the client, so both build the same query input
export const HOME_PAGE_SIZE = 6;

export const getDisplayFromParam = (
  value: string | null | undefined
): BountyDisplayType => {
  if (value === 'open' || value === 'progress' || value === 'past') {
    return value;
  }
  return 'open';
};

export const getSortFromParam = (
  value: string | null | undefined
): BountySortType => {
  if (value === 'value' || value === 'date') {
    return value;
  }
  return 'value';
};
