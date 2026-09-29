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
  createConnector: (...args: unknown[]) => args[0],
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
jest.mock('@zerodev/social-validator', () => ({
  getSocialValidator: jest.fn(),
  initiateLogin: jest.fn(),
  isAuthorized: jest.fn(),
  logout: jest.fn(),
}));

import {
  DEPOSIT_SOURCE_CHAIN_IDS,
  PASSKEY_SESSION_KEY,
  SOCIAL_CALLBACK_PATH,
  SOCIAL_SESSION_KEY,
  ZERODEV_DESTINATION_CHAIN,
  zerodevConfigured,
} from '@/zerodev/config';
import {
  clearPasskeySession,
  readPasskeySession,
} from '@/zerodev/passkeySmartAccount';
import {
  clearSocialSession,
  consumeSocialPending,
  markSocialPending,
  readSocialSession,
} from '@/zerodev/socialSmartAccount';
import {
  zerodevPasskeyConnector,
  zerodevSocialConnector,
} from '@/zerodev/zerodevConnector';

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

  it('uses /social-callback for the OAuth landing page', () => {
    expect(SOCIAL_CALLBACK_PATH).toBe('/social-callback');
  });
});

describe('passkey session storage', () => {
  afterEach(() => clearPasskeySession());

  it('returns null with no stored session', () => {
    expect(readPasskeySession()).toBeNull();
  });

  it('round-trips a stored session', () => {
    window.localStorage.setItem(
      PASSKEY_SESSION_KEY,
      JSON.stringify({
        address: '0x000000000000000000000000000000000000dEaD',
        serializedValidator: 'blob',
      })
    );
    expect(readPasskeySession()?.address).toBe(
      '0x000000000000000000000000000000000000dEaD'
    );
    clearPasskeySession();
    expect(readPasskeySession()).toBeNull();
  });

  it('rejects malformed stored data', () => {
    window.localStorage.setItem(PASSKEY_SESSION_KEY, 'not-json{');
    expect(readPasskeySession()).toBeNull();
  });
});

describe('social session storage', () => {
  afterEach(() => clearSocialSession());

  it('returns null with no stored session', () => {
    expect(readSocialSession()).toBeNull();
  });

  it('round-trips a stored session', () => {
    window.localStorage.setItem(
      SOCIAL_SESSION_KEY,
      JSON.stringify({
        address: '0x000000000000000000000000000000000000dEaD',
        provider: 'google',
      })
    );
    const session = readSocialSession();
    expect(session?.address).toBe('0x000000000000000000000000000000000000dEaD');
    expect(session?.provider).toBe('google');
    clearSocialSession();
    expect(readSocialSession()).toBeNull();
  });

  it('marks and consumes the post-OAuth pending flag exactly once', () => {
    expect(consumeSocialPending()).toBe(false);
    markSocialPending();
    expect(consumeSocialPending()).toBe(true);
    expect(consumeSocialPending()).toBe(false);
  });
});

describe('zerodev wagmi connectors', () => {
  const emitter = {
    emit: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
  };
  const makePasskey = () =>
    zerodevPasskeyConnector()({
      chains: [ZERODEV_DESTINATION_CHAIN] as never,
      emitter: emitter as never,
    });
  const makeSocial = () =>
    zerodevSocialConnector()({
      chains: [ZERODEV_DESTINATION_CHAIN] as never,
      emitter: emitter as never,
    });

  it('passkey connector has a stable id, name and type', () => {
    const c = makePasskey();
    expect(c.id).toBe('zerodev-passkey');
    expect(c.name).toBe('Passkey (smart account)');
    expect(c.type).toBe('zerodev-passkey');
  });

  it('social connector has a stable id, name and type', () => {
    const c = makeSocial();
    expect(c.id).toBe('zerodev-social');
    expect(c.name).toBe('Google (smart account)');
    expect(c.type).toBe('zerodev-social');
  });

  it('passkey is not authorized without a stored session', async () => {
    await expect(makePasskey().isAuthorized()).resolves.toBe(false);
  });

  it('social is not authorized without a stored session', async () => {
    await expect(makeSocial().isAuthorized()).resolves.toBe(false);
  });

  it('both connectors return the destination chain id', async () => {
    await expect(makePasskey().getChainId()).resolves.toBe(42161);
    await expect(makeSocial().getChainId()).resolves.toBe(42161);
  });

  it('both connectors report no accounts when disconnected', async () => {
    await expect(makePasskey().getAccounts()).resolves.toEqual([]);
    await expect(makeSocial().getAccounts()).resolves.toEqual([]);
  });
});
