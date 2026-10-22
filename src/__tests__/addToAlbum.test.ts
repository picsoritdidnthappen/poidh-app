/**
 * @jest-environment node
 */
import { createCallerFactory, createTRPCRouter } from '@/trpc/init';
import { bountiesRouter } from '@/trpc/routers/bounties';
import type { Context } from '@/trpc/context';

// superjson is ESM-only and the server-side caller never serialises anyway
jest.mock('superjson', () => ({
  __esModule: true,
  default: { serialize: jest.fn(), deserialize: jest.fn() },
}));
jest.mock('@/trpc/routers/web3', () => ({}));
jest.mock('@/utils/config', () => ({ chains: {} }));
jest.mock('@/utils/serverEnv', () => ({
  __esModule: true,
  default: { ADMINS: ['0xadmin'] },
}));

const mockFindBounty = jest.fn();
const mockUpsert = jest.fn();
jest.mock('prisma/prisma', () => ({
  __esModule: true,
  default: {
    bounties: { findUnique: (...args: unknown[]) => mockFindBounty(...args) },
    bountiesExtra: { upsert: (...args: unknown[]) => mockUpsert(...args) },
  },
}));

const createCaller = createCallerFactory(createTRPCRouter(bountiesRouter));

/**
 * Makes a bounties router caller, signed in as the given address if any.
 */
function makeCaller(address?: string) {
  const ctx: Context = {
    host: 'poidh.xyz',
    sessionToken: null,
    resHeaders: null,
    getSession: async () => (address ? { address } : null),
  };

  return createCaller(ctx);
}

/**
 * Has the database return a bounty created this many minutes ago.
 */
function mockBounty({
  minutesAgo,
  album = null,
}: {
  minutesAgo: number;
  album?: string | null;
}) {
  const createdAt = Math.floor((Date.now() - minutesAgo * 60_000) / 1000);
  mockFindBounty.mockResolvedValue({ createdAt, extra: { album } });
}

const input = { bountyId: 1, chainId: 8453, album: 'cats' };

beforeEach(() => {
  mockFindBounty.mockReset();
  mockUpsert.mockReset();
  mockUpsert.mockResolvedValue({ album: 'cats' });
});

describe('bounties.addToAlbum', () => {
  it('lets anyone set the album on a new bounty with no album', async () => {
    mockBounty({ minutesAgo: 1 });

    await makeCaller().addToAlbum(input);

    expect(mockUpsert).toHaveBeenCalled();
  });

  it('refuses once the bounty is older than the window', async () => {
    mockBounty({ minutesAgo: 6 });

    await expect(makeCaller().addToAlbum(input)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('refuses when the bounty already has an album', async () => {
    mockBounty({ minutesAgo: 1, album: 'dogs' });

    await expect(makeCaller().addToAlbum(input)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('does nothing for an empty album', async () => {
    await expect(
      makeCaller().addToAlbum({ ...input, album: ' ' })
    ).resolves.toBeNull();
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('lets a signed-in admin change the album at any time', async () => {
    mockBounty({ minutesAgo: 60 * 24, album: 'dogs' });

    await makeCaller('0xadmin').addToAlbum(input);

    expect(mockUpsert).toHaveBeenCalled();
  });

  it('treats a signed-in non-admin like anyone else', async () => {
    mockBounty({ minutesAgo: 60 * 24 });

    await expect(
      makeCaller('0xsomeone').addToAlbum(input)
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
