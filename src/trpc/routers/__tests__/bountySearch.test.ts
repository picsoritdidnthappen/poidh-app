/**
 * @jest-environment node
 */
import { createCallerFactory, createTRPCRouter } from '../../init';
import { bountiesRouter, likeLiteral } from '../bounties';

const mockFindMany = jest.fn();
// superjson ships ESM only, which Jest 27 can't load; the caller doesn't need it.
jest.mock('superjson', () => ({
  __esModule: true,
  default: {
    serialize: (v: unknown) => ({ json: v }),
    deserialize: (v: { json: unknown }) => v.json,
  },
}));
jest.mock('prisma/prisma', () => ({
  __esModule: true,
  default: { bounties: { findMany: (...a: unknown[]) => mockFindMany(...a) } },
}));
jest.mock('../admin', () => ({ checkIsIssuer: jest.fn() }));
jest.mock('../web3', () => ({ getEverHadExternalContributor: jest.fn() }));

const caller = createCallerFactory(createTRPCRouter(bountiesRouter))(
  {} as never
);

beforeEach(() => mockFindMany.mockReset().mockResolvedValue([]));

describe('likeLiteral', () => {
  it.each([
    ['dog', 'dog'],
    ['100%', '100\\%'],
    ['%%%%', '\\%\\%\\%\\%'],
    ['snake_case', 'snake\\_case'],
    ['back\\slash', 'back\\\\slash'],
  ])('%s → %s', (input, escaped) => {
    expect(likeLiteral(input)).toBe(escaped);
  });
});

describe('bounties.fetchByKeyword', () => {
  it('searches for "%" literally instead of matching every bounty', async () => {
    await caller.fetchByKeyword({ keyword: '%%%%' });
    const { where } = mockFindMany.mock.calls[0][0];
    expect(where.OR).toEqual([
      { title: { contains: '\\%\\%\\%\\%', mode: 'insensitive' } },
      { description: { contains: '\\%\\%\\%\\%', mode: 'insensitive' } },
    ]);
  });

  it('keeps bounties that share an id on different chains', async () => {
    await caller.fetchByKeyword({ keyword: 'photo' });
    expect(mockFindMany.mock.calls[0][0].distinct).toEqual(['id', 'chainId']);
  });

  it('lists open bounties when there is no keyword', async () => {
    await caller.fetchByKeyword({ keyword: '  ' });
    const { where } = mockFindMany.mock.calls[0][0];
    expect(where).toMatchObject({ inProgress: true, isVoting: false });
    expect(where.OR).toBeUndefined();
  });
});
