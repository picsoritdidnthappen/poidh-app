export type BountyCursor = {
  createdAt: number;
  amountSort: number;
  dates: number[];
  bountyId?: number;
  chainId?: number;
};

type BountyCursorInput = Partial<BountyCursor>;

export type BountyListItem = {
  id: number;
  chainId: number;
  createdAt: { toNumber: () => number };
  amountSort: number;
};

export function valueSortOrderBy() {
  return [
    { amountSort: 'desc' as const },
    { bountyId: 'desc' as const },
    { chainId: 'desc' as const },
  ];
}

export function valueSortCursorWhere(
  cursor: BountyCursorInput | null | undefined
) {
  if (!cursor) return {};
  if (cursor.amountSort === undefined) return {};

  if (cursor.bountyId === undefined || cursor.chainId === undefined) {
    return { amountSort: { lt: cursor.amountSort } };
  }

  return {
    OR: [
      { amountSort: { lt: cursor.amountSort } },
      { amountSort: cursor.amountSort, bountyId: { lt: cursor.bountyId } },
      {
        amountSort: cursor.amountSort,
        bountyId: cursor.bountyId,
        chainId: { lt: cursor.chainId },
      },
    ],
  };
}

export function nextBountyCursor(
  items: BountyListItem[],
  limit: number,
  previousDates: number[] = []
): BountyCursor | undefined {
  if (items.length !== limit) return undefined;

  const last = items[items.length - 1];

  return {
    createdAt: last.createdAt.toNumber(),
    amountSort: last.amountSort,
    bountyId: last.id,
    chainId: last.chainId,
    dates: [
      ...previousDates,
      ...items.map((item) => item.createdAt.toNumber()),
    ],
  };
}
