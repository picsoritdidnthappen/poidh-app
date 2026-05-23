import {
  buildNextCursor,
  buildValueSortCursorWhere,
  valueSortOrderBy,
} from './bountyPagination';

function decimal(value: number) {
  return { toNumber: () => value };
}

describe('bounty pagination', () => {
  it('uses a stable value-sort tie breaker so equal-value bounties are not skipped', () => {
    expect(
      buildValueSortCursorWhere({
        createdAt: 1_770_000_000,
        amountSort: 50,
        bountyId: 215,
        chainId: 42161,
        dates: [1_770_000_000],
      })
    ).toEqual({
      OR: [
        { amountSort: { lt: 50 } },
        { amountSort: 50, bountyId: { lt: 215 } },
        { amountSort: 50, bountyId: 215, chainId: { lt: 42161 } },
      ],
    });
  });

  it('preserves the previous cursor shape for older clients', () => {
    expect(
      buildValueSortCursorWhere({
        createdAt: 1_770_000_000,
        amountSort: 50,
        dates: [1_770_000_000],
      })
    ).toEqual({ amountSort: { lt: 50 } });
  });

  it('orders value-sort pages by amount then stable bounty identity', () => {
    expect(valueSortOrderBy()).toEqual([
      { amountSort: 'desc' },
      { bountyId: 'desc' },
      { chainId: 'desc' },
    ]);
  });

  it('returns a cursor with bounty identity for the next value-sort page', () => {
    const cursor = buildNextCursor(
      [
        {
          id: 216,
          chainId: 42161,
          createdAt: decimal(1_770_000_001),
          amountSort: 50,
        },
        {
          id: 215,
          chainId: 42161,
          createdAt: decimal(1_770_000_000),
          amountSort: 50,
        },
      ],
      2,
      [1_769_999_999]
    );

    expect(cursor).toEqual({
      createdAt: 1_770_000_000,
      amountSort: 50,
      bountyId: 215,
      chainId: 42161,
      dates: [1_769_999_999, 1_770_000_001, 1_770_000_000],
    });
  });
});
