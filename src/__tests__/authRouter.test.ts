/**
 * @jest-environment node
 */
import { privateKeyToAccount } from 'viem/accounts';
import { createSiweMessage } from 'viem/siwe';
import { createCallerFactory, createTRPCRouter } from '@/trpc/init';
import { authRouter } from '@/trpc/routers/auth';
import type { Context } from '@/trpc/context';

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

const mockUpdateMany = jest.fn();
jest.mock('prisma/prisma', () => ({
  __esModule: true,
  default: {
    authNonces: { updateMany: (...args: unknown[]) => mockUpdateMany(...args) },
  },
}));
jest.mock('@/trpc/session', () => ({
  ...jest.requireActual('@/trpc/session'),
  createSession: jest.fn(async () => 'session-token'),
  deleteSession: jest.fn(),
}));

const account = privateKeyToAccount(
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
);
const createCaller = createCallerFactory(createTRPCRouter(authRouter));

/**
 * Makes an auth router caller for a request on this host, plus the response
 * headers it writes to. The headers are a small stub because Jest 27's node
 * environment has no Headers global.
 */
function makeCaller(host: string | null) {
  const values = new Map<string, string>();
  const resHeaders = {
    append: (name: string, value: string) => values.set(name, value),
    get: (name: string) => values.get(name) ?? null,
  } as unknown as Headers;
  const ctx: Context = {
    host,
    sessionToken: null,
    resHeaders,
    getSession: async () => null,
  };

  return { caller: createCaller(ctx), resHeaders };
}

/**
 * Builds a SIWE message for the test account and signs it.
 */
async function signedMessage({
  domain = 'poidh.xyz',
  expirationTime = new Date(Date.now() + 60_000),
} = {}) {
  const message = createSiweMessage({
    domain,
    address: account.address,
    uri: `https://${domain}`,
    version: '1',
    chainId: 8453,
    nonce: 'abcdefgh12345678',
    expirationTime,
  });

  return { message, signature: await account.signMessage({ message }) };
}

beforeEach(() => {
  mockUpdateMany.mockReset();
  mockUpdateMany.mockResolvedValue({ count: 1 });
});

describe('auth.signIn', () => {
  it('signs in and sets the session cookie', async () => {
    const { caller, resHeaders } = makeCaller('poidh.xyz');

    await expect(caller.signIn(await signedMessage())).resolves.toEqual({
      address: account.address.toLowerCase(),
    });
    expect(resHeaders.get('Set-Cookie')).toContain(
      'poidh_session=session-token'
    );
  });

  it('rejects a message signed for another host', async () => {
    const { caller } = makeCaller('poidh.xyz');

    await expect(
      caller.signIn(await signedMessage({ domain: 'staging.poidh.xyz' }))
    ).rejects.toThrow('Signature is invalid');
  });

  it('rejects hosts that are not allowed', async () => {
    const { caller } = makeCaller('evil.com');

    await expect(
      caller.signIn(await signedMessage({ domain: 'evil.com' }))
    ).rejects.toThrow('Sign-in is not available on this site');
  });

  it('rejects an expired message', async () => {
    const { caller } = makeCaller('poidh.xyz');

    await expect(
      caller.signIn(
        await signedMessage({ expirationTime: new Date(Date.now() - 1000) })
      )
    ).rejects.toThrow('Signature is invalid');
  });

  it('rejects a signature from someone else', async () => {
    const { caller } = makeCaller('poidh.xyz');
    const { message } = await signedMessage();
    const other = privateKeyToAccount(
      '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
    );

    await expect(
      caller.signIn({
        message,
        signature: await other.signMessage({ message }),
      })
    ).rejects.toThrow('Signature is invalid');
  });

  it('rejects a nonce that was already used or expired', async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 });
    const { caller, resHeaders } = makeCaller('poidh.xyz');

    await expect(caller.signIn(await signedMessage())).rejects.toThrow(
      'Sign-in request expired'
    );
    expect(resHeaders.get('Set-Cookie')).toBeNull();
  });
});
