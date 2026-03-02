/**
 * Focused tests for the fetchAll router fix (issue #1216).
 *
 * These tests verify that bounties WITHOUT a corresponding bountiesExtra row
 * (i.e. amountSort is effectively null/missing) still appear when sorting
 * "by value" on the homepage.
 *
 * We mock Prisma so no real database is required.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Minimal Prisma mock
// ---------------------------------------------------------------------------
const mockFindMany = vi.fn();

vi.mock('prisma/prisma', () => ({
  default: {
    bounties: {
      findMany: mockFindMany,
    },
    bountiesExtra: {
      findMany: mockFindMany,
    },
  },
}));

// Re-import after mock so the module picks up the mock
import { bountiesRouter } from './bounties';

// Helper to create a fake bounty object
function makeBounty(
  id: number,
  extraAmountSort: number | null = null
) {
  return {
    id,
    chainId: 42161,
    createdAt: new Date('2024-01-01'),
    inProgress: true,
    isCanceled: false,
    isVoting: false,
    ban: [],
    claims: [],
    participations: [],
    extra: extraAmountSort !== null ? { amountSort: extraAmountSort } : null,
  };
}

// Minimal caller shim – the real tRPC caller isn't needed for unit tests
async function callFetchAll(input: Parameters<typeof bountiesRouter['fetchAll']['_def']['inputs'][0]['parse']>[0]) {
  // Directly invoke the resolver function by accessing the underlying query handler
  // This avoids needing a full tRPC setup while still exercising the real logic.
  const handler = (bountiesRouter.fetchAll as any)._def.resolver;
  return handler({ input, ctx: {} });
}

describe('fetchAll – sortByValue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('includes bounties that have NO extra row (amountSort treated as 0)', async () => {
    // Simulate bounties 213 & 215 which have no bountiesExtra row
    const bounty213 = makeBounty(213, null); // no extra row
    const bounty215 = makeBounty(215, null); // no extra row
    const bounty100 = makeBounty(100, 50);   // has extra row with value

    mockFindMany.mockResolvedValueOnce([bounty100, bounty213, bounty215]);

    const result = await callFetchAll({
      status: 'open',
      sortType: 'value',
      limit: 10,
      cursor: null,
    });

    const ids = result.items.map((b: any) => b.id);
    expect(ids).toContain(213);
    expect(ids).toContain(215);
    expect(ids).toContain(100);
  });

  it('normalises missing extra rows to amountSort=0', async () => {
    const bounty213 = makeBounty(213, null);
    mockFindMany.mockResolvedValueOnce([bounty213]);

    const result = await callFetchAll({
      status: 'open',
      sortType: 'value',
      limit: 10,
      cursor: null,
    });

    expect(result.items[0].amountSort).toBe(0);
  });

  it('does NOT regress date sort – all bounties still appear', async () => {
    const bounty213 = makeBounty(213, null);
    const bounty215 = makeBounty(215, null);
    mockFindMany.mockResolvedValueOnce([bounty215, bounty213]);

    const result = await callFetchAll({
      status: 'open',
      sortType: 'date',
      limit: 10,
      cursor: null,
    });

    const ids = result.items.map((b: any) => b.id);
    expect(ids).toContain(213);
    expect(ids).toContain(215);
  });
});
