// ESM-only deps are mocked: this suite tests poidh's own logic only.
jest.mock('wagmi/chains', () => ({
  arbitrum: {
    id: 42161,
    name: 'Arbitrum One',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: ['https://arb1.arbitrum.io/rpc'] } },
  },
}));
jest.mock('wagmi', () => ({
  createConnector: (fn: any) => fn,
}));
jest.mock('viem', () => ({
  createPublicClient: () => ({ request: jest.fn() }),
  http: () => ({}),
  toHex: (n: number) => '0x' + n.toString(16),
}));
jest.mock('viem/account-abstraction', () => ({
  entryPoint07Address: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
}));
jest.mock('@zerodev/sdk', () => ({
  createKernelAccount: jest.fn(),
  createKernelAccountClient: jest.fn(),
}));
jest.mock('@zerodev/sdk/constants', () => ({ KERNEL_V3_1: '0.3.1' }));
jest.mock('@zerodev/passkey-validator', () => ({
  toPasskeyValidator: jest.fn(),
  deserializePasskeyValidator: jest.fn(),
  toWebAuthnKey: jest.fn(),
  WebAuthnMode: { Register: 'register', Login: 'login' },
  PasskeyValidatorContractVersion: { V0_0_2_UNPATCHED: '0.0.2' },
}));

import {
  DEPOSIT_SOURCE_CHAIN_IDS,
  PASSKEY_SESSION_KEY,
  ZERODEV_DESTINATION_CHAIN,
  zerodevConfigured,
} from '@/zerodev/config';
import {
  clearStoredSession,
  readStoredSession,
} from '@/zerodev/passkeySmartAccount';
import { zerodevPasskeyConnector } from '@/zerodev/zerodevConnector';

describe('zerodev config', () => {
  it('targets Arbitrum as the destination chain', () => {
    expect(ZERODEV_DESTINATION_CHAIN.id).toBe(42161);
  });

  it('offers deposits from every poidh chain', () => {
    expect(DEPOSIT_SOURCE_CHAIN_IDS).toEqual([1, 8453, 42161, 666666666]);
  });

  it('reports unconfigured without a project id', () => {
    expect(zerodevConfigured()).toBe(false);
  });
});

describe('passkey session storage', () => {
  afterEach(() => clearStoredSession());

  it('returns null with no stored session', () => {
    expect(readStoredSession()).toBeNull();
  });

  it('round-trips a stored session', () => {
    window.localStorage.setItem(
      PASSKEY_SESSION_KEY,
      JSON.stringify({
        address: '0x000000000000000000000000000000000000dEaD',
        serializedValidator: 'blob',
      })
    );
    expect(readStoredSession()?.address).toBe(
      '0x000000000000000000000000000000000000dEaD'
    );
    clearStoredSession();
    expect(readStoredSession()).toBeNull();
  });
});

describe('zerodev wagmi connector', () => {
  const emitter = {
    emit: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
  };
  const make = () =>
    zerodevPasskeyConnector()({
      chains: [ZERODEV_DESTINATION_CHAIN] as never,
      emitter: emitter as never,
    });

  it('has a stable id, name and type', () => {
    const c = make();
    expect(c.id).toBe('zerodev-passkey');
    expect(c.name).toBe('Passkey (smart account)');
    expect(c.type).toBe('zerodev-passkey');
  });

  it('is not authorized without a stored session', async () => {
    await expect(make().isAuthorized()).resolves.toBe(false);
  });

  it('returns the destination chain id', async () => {
    await expect(make().getChainId()).resolves.toBe(42161);
  });
});
