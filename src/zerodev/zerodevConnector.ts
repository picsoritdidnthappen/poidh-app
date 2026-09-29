'use client';

import { createConnector } from 'wagmi';
import {
  createPublicClient,
  http,
  toHex,
  type Address,
  type EIP1193Provider,
} from 'viem';
import {
  clearPasskeySession,
  createPasskeySmartAccount,
  kernelClientForPasskeySession,
  readPasskeySession,
  type PasskeySession,
} from '@/zerodev/passkeySmartAccount';
import {
  consumeSocialPending,
  createSocialSmartAccount,
  kernelClientForSocialSession,
  logoutSocial,
  markSocialPending,
  readSocialSession,
  socialLoginAuthorized,
  startGoogleLogin,
  type SocialSession,
} from '@/zerodev/socialSmartAccount';
import { ZERODEV_DESTINATION_CHAIN, zerodevConfigured } from '@/zerodev/config';

type PasskeyKernelClient = Awaited<
  ReturnType<typeof kernelClientForPasskeySession>
>;
type SocialKernelClient = Awaited<
  ReturnType<typeof kernelClientForSocialSession>
>;
type KernelClient = PasskeyKernelClient | SocialKernelClient;

interface SmartAccountSession {
  address: Address;
}

/**
 * EIP-1193 adapter over a ZeroDev Kernel account client. wagmi /
 * RainbowKit hooks speak plain JSON-RPC; signing and sending route
 * through the smart account as ERC-4337 user operations, reads fan out
 * to a public client. wallet_sendCalls (EIP-5792) batches several
 * contract calls into ONE user operation (e.g. approve + fund in one go).
 */
function kernelToEip1193(
  kernelClient: KernelClient,
  session: SmartAccountSession
): EIP1193Provider {
  const chain = ZERODEV_DESTINATION_CHAIN;
  const publicClient = createPublicClient({ chain, transport: http() });

  const request = (async (args: { method: string; params?: unknown }) => {
    const { method, params } = args;
    switch (method) {
      case 'eth_accounts':
      case 'eth_requestAccounts':
        return [session.address];
      case 'eth_chainId':
        return toHex(chain.id);
      case 'net_version':
        return String(chain.id);
      case 'personal_sign': {
        // params: [message, address]
        const [message] = params as [`0x${string}`, Address];
        return kernelClient.signMessage({ message: { raw: message } });
      }
      case 'eth_signTypedData_v4': {
        // params: [address, typedDataJson]
        const [, typedDataJson] = params as [Address, string];
        const typedData = JSON.parse(typedDataJson);
        return kernelClient.signTypedData({
          domain: typedData.domain,
          types: typedData.types,
          primaryType: typedData.primaryType,
          message: typedData.message,
        });
      }
      case 'eth_sendTransaction': {
        const [tx] = params as [
          { to: Address; data?: `0x${string}`; value?: `0x${string}` }
        ];
        return kernelClient.sendTransaction({
          to: tx.to,
          data: tx.data ?? '0x',
          value: tx.value ? BigInt(tx.value) : BigInt(0),
        });
      }
      case 'wallet_sendCalls': {
        const [req] = params as [
          {
            calls: {
              to: Address;
              data?: `0x${string}`;
              value?: `0x${string}`;
            }[];
          }
        ];
        return kernelClient.sendTransaction({
          calls: req.calls.map((c) => ({
            to: c.to,
            data: c.data ?? '0x',
            value: c.value ? BigInt(c.value) : BigInt(0),
          })),
        });
      }
      case 'wallet_switchEthereumChain': {
        const [req] = params as [{ chainId: string }];
        if (parseInt(req.chainId, 16) !== chain.id) {
          throw new Error(
            `poidh smart accounts live on ${chain.name} (${chain.id})`
          );
        }
        return null;
      }
      default:
        return publicClient.request(args as never);
    }
  }) as unknown as EIP1193Provider['request'];

  return {
    request,
    on: () => {
      // EIP-1193 event subscription not needed for the redirect-based flow.
    },
    removeListener: () => {
      // No subscriptions are ever registered; nothing to remove.
    },
  } as unknown as EIP1193Provider;
}

async function buildProvider(
  session: PasskeySession | SocialSession,
  kind: 'passkey' | 'social'
): Promise<EIP1193Provider> {
  const kernelClient =
    kind === 'passkey'
      ? await kernelClientForPasskeySession(session as PasskeySession)
      : await kernelClientForSocialSession(session as SocialSession);
  return kernelToEip1193(kernelClient, session);
}

/**
 * wagmi v2 connector for the poidh passkey smart account. With a stored
 * session it restores silently; without one it runs the WebAuthn
 * register ceremony (asking for a passkey name).
 */
export function zerodevPasskeyConnector() {
  let session: PasskeySession | null = null;
  let provider: EIP1193Provider | null = null;

  return createConnector<EIP1193Provider>((config) => ({
    id: 'zerodev-passkey',
    name: 'Passkey (smart account)',
    type: 'zerodev-passkey',

    async connect() {
      session = readPasskeySession();
      if (!session) {
        const name =
          (typeof window !== 'undefined' &&
            window.prompt(
              'Name this passkey (e.g. your device or email):',
              `poidh-${new Date().toISOString().slice(0, 10)}`
            )) ||
          undefined;
        if (!name) throw new Error('passkey registration cancelled');
        session = await createPasskeySmartAccount(name);
      }
      provider = await buildProvider(session, 'passkey');
      const chainId = ZERODEV_DESTINATION_CHAIN.id;
      const accounts = [session.address] as const;
      config.emitter.emit('connect', { accounts, chainId });
      return { accounts, chainId };
    },

    async disconnect() {
      clearPasskeySession();
      session = null;
      provider = null;
      config.emitter.emit('disconnect');
    },

    async getAccounts() {
      return session ? [session.address] : [];
    },

    async getChainId() {
      return ZERODEV_DESTINATION_CHAIN.id;
    },

    async getProvider() {
      if (!provider && session) {
        provider = await buildProvider(session, 'passkey');
      }
      return provider as EIP1193Provider;
    },

    async isAuthorized() {
      session = readPasskeySession();
      return Boolean(session) && zerodevConfigured();
    },

    onAccountsChanged() {
      // Wagmi drives account state from getAccount(); no push events needed.
    },
    onChainChanged() {
      // Chain is fixed to Arbitrum for ZeroDev smart accounts.
    },
    onDisconnect() {
      session = null;
      provider = null;
    },
  }));
}

/**
 * wagmi v2 connector for the poidh Google social smart account.
 *
 * Google OAuth is a full-page redirect, so connect() has two paths:
 *  - returning session (or a fresh /social-callback landing): build the
 *    account and emit connect;
 *  - otherwise: kick off initiateLogin() and navigate away — the promise
 *    intentionally never resolves; /social-callback finishes the flow.
 */
export function zerodevSocialConnector() {
  let session: SocialSession | null = null;
  let provider: EIP1193Provider | null = null;

  return createConnector<EIP1193Provider>((config) => ({
    id: 'zerodev-social',
    name: 'Google (smart account)',
    type: 'zerodev-social',

    async connect() {
      session = readSocialSession();
      const justLoggedIn =
        !session && (await socialLoginAuthorized().catch(() => false));

      if (!session && !justLoggedIn) {
        // No session yet — start the Google OAuth redirect. The page
        // navigates away; this promise never resolves by design.
        markSocialPending();
        await startGoogleLogin();
        throw new Error('redirecting to Google login…');
      }

      if (!session) {
        // Fresh landing from /social-callback: derive the account.
        session = await createSocialSmartAccount();
        consumeSocialPending();
      }
      provider = await buildProvider(session, 'social');
      const chainId = ZERODEV_DESTINATION_CHAIN.id;
      const accounts = [session.address] as const;
      config.emitter.emit('connect', { accounts, chainId });
      return { accounts, chainId };
    },

    async disconnect() {
      await logoutSocial();
      session = null;
      provider = null;
      config.emitter.emit('disconnect');
    },

    async getAccounts() {
      return session ? [session.address] : [];
    },

    async getChainId() {
      return ZERODEV_DESTINATION_CHAIN.id;
    },

    async getProvider() {
      if (!provider && session) {
        provider = await buildProvider(session, 'social');
      }
      return provider as EIP1193Provider;
    },

    async isAuthorized() {
      session = readSocialSession();
      return Boolean(session) && zerodevConfigured();
    },

    onAccountsChanged() {
      // Wagmi drives account state from getAccount(); no push events needed.
    },
    onChainChanged() {
      // Chain is fixed to Arbitrum for ZeroDev smart accounts.
    },
    onDisconnect() {
      session = null;
      provider = null;
    },
  }));
}
