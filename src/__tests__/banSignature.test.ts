/**
 * @jest-environment node
 */
import { privateKeyToAccount } from 'viem/accounts';
import { createCallerFactory, createTRPCRouter } from '@/trpc/init';
import { adminRouter } from '@/trpc/routers/admin';
import type { Context } from '@/trpc/context';
import { getBanMessage } from '@/utils/utils';

// superjson is ESM-only and the server-side caller never serialises anyway
jest.mock('superjson', () => ({
  __esModule: true,
  default: { serialize: jest.fn(), deserialize: jest.fn() },
}));

// With no RPC, viem falls back to checking the signature locally, which is
// all a regular wallet needs. Keeps the tests fast and offline.
jest.mock('@/utils/publicClients', () => {
  const { createPublicClient, custom } = jest.requireActual('viem');
  const chains = jest.requireActual('viem/chains');
  const transport = custom(
    {
      request: async () => {
        throw new Error('offline');
      },
    },
    { retryCount: 0 }
  );
  const client = (chain: unknown) => createPublicClient({ chain, transport });

  return {
    mainnetPublicClient: client(chains.mainnet),
    basePublicClient: client(chains.base),
    degenPublicClient: client(chains.degen),
    arbitrumPublicClient: client(chains.arbitrum),
  };
});

const admin = privateKeyToAccount(
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
);
const someoneElse = privateKeyToAccount(
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
);

jest.mock('@/utils/serverEnv', () => ({
  __esModule: true,
  default: { ADMINS: ['0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266'] },
}));

const mockClaimNonce = jest.fn();
const mockHideComments = jest.fn();
jest.mock('prisma/prisma', () => ({
  __esModule: true,
  default: {
    authNonces: {
      updateMany: (...args: unknown[]) => mockClaimNonce(...args),
    },
    comments: {
      findFirst: async () => ({ id: 7 }),
      updateMany: (...args: unknown[]) => mockHideComments(...args),
    },
  },
}));

const caller = createCallerFactory(createTRPCRouter(adminRouter))({
  host: 'poidh.xyz',
  sessionToken: null,
  resHeaders: null,
  getSession: async () => null,
} satisfies Context);

const ban = { type: 'comment', id: 7, chainId: 8453, nonce: 'abc123' } as const;

/**
 * Builds a banComment request signed by the given account.
 */
async function signedBan(
  account = admin,
  signed: Parameters<typeof getBanMessage>[0] = ban
) {
  return {
    id: ban.id,
    chainId: ban.chainId,
    nonce: ban.nonce,
    address: account.address,
    chainName: 'base' as const,
    signature: await account.signMessage({ message: getBanMessage(signed) }),
  };
}

beforeEach(() => {
  mockClaimNonce.mockReset();
  mockClaimNonce.mockResolvedValue({ count: 1 });
  mockHideComments.mockReset();
});

describe('admin.banComment', () => {
  it('bans with a valid admin signature and uses up the nonce', async () => {
    await caller.banComment(await signedBan());

    expect(mockClaimNonce).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ nonce: 'abc123', usedAt: null }),
      })
    );
    expect(mockHideComments).toHaveBeenCalled();
  });

  it('refuses a replayed signature whose nonce is already used', async () => {
    mockClaimNonce.mockResolvedValue({ count: 0 });

    await expect(caller.banComment(await signedBan())).rejects.toThrow(
      'already used'
    );
    expect(mockHideComments).not.toHaveBeenCalled();
  });

  it('refuses a signature made for a different item', async () => {
    const request = await signedBan(admin, { ...ban, id: 8 });

    await expect(caller.banComment(request)).rejects.toThrow(
      'Signature is invalid'
    );
    expect(mockClaimNonce).not.toHaveBeenCalled();
  });

  it('refuses a signature made with a different nonce', async () => {
    const request = await signedBan(admin, { ...ban, nonce: 'other' });

    await expect(caller.banComment(request)).rejects.toThrow(
      'Signature is invalid'
    );
  });

  it('refuses someone who is not an admin', async () => {
    await expect(
      caller.banComment(await signedBan(someoneElse))
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});

describe('getBanMessage', () => {
  it('reads clearly in the wallet', () => {
    expect(getBanMessage(ban)).toBe(
      [
        'poidh admin action',
        '',
        'Ban',
        'Type: Comment',
        'ID: 7',
        'Chain: Base (8453)',
        'Nonce: abc123',
      ].join('\n')
    );
  });
});
