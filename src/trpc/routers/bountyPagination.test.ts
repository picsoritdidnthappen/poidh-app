import {
  nextBountyCursor,
  valueSortCursorWhere,
  valueSortOrderBy,
} from './bountyPagination';

function decimal(value: number) {
  return { toNumber: () => value };
}

describe('bounty pagination', () => {
  it('orders value pages by amount and stable bounty identity', () => {
    expect(valueSortOrderBy()).toEqual([
      { amountSort: 'desc' },
      { bountyId: 'desc' },
      { chainId: 'desc' },
    ]);
  });

  it('keeps equal-value bounties after the cursor visible', () => {
    expect(
      valueSortCursorWhere({
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

  it('preserves older cursors that do not include bounty identity', () => {
    expect(
      valueSortCursorWhere({
        createdAt: 1_770_000_000,
        amountSort: 50,
        dates: [1_770_000_000],
      })
    ).toEqual({ amountSort: { lt: 50 } });
  });

  it('returns a cursor with bounty identity for the next page', () => {
    expect(
      nextBountyCursor(
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
      )
    ).toEqual({
      createdAt: 1_770_000_000,
      amountSort: 50,
      bountyId: 215,
      chainId: 42161,
      dates: [1_769_999_999, 1_770_000_001, 1_770_000_000],
    });
  });

  it('does not return a cursor for the final page', () => {
    expect(
      nextBountyCursor(
        [
          {
            id: 215,
            chainId: 42161,
            createdAt: decimal(1_770_000_000),
            amountSort: 50,
          },
        ],
        2
      )
    ).toBeUndefined();
  });
});
