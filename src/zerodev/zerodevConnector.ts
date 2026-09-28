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
  clearStoredSession,
  createPasskeySmartAccount,
  kernelClientForSession,
  readStoredSession,
  type PasskeySession,
} from '@/zerodev/passkeySmartAccount';
import { ZERODEV_DESTINATION_CHAIN, zerodevConfigured } from '@/zerodev/config';

type KernelClient = Awaited<ReturnType<typeof kernelClientForSession>>;

/**
 * EIP-1193 adapter over a ZeroDev Kernel account client: wagmi/
 * rainbowkit hooks talk plain JSON-RPC; signing and sending route
 * through the smart account as user operations, reads forward to a
 * public client. wallet_sendCalls (EIP-5792) batches several contract
 * calls into ONE user operation (e.g. approve + fund in one step).
 */
function kernelToEip1193(
  kernelClient: KernelClient,
  session: PasskeySession
): EIP1193Provider {
  const chain = ZERODEV_DESTINATION_CHAIN;
  const publicClient = createPublicClient({ chain, transport: http() });

  const request = (async (args: any) => {
    const { method, params } = args;
    switch (method as string) {
      case 'eth_accounts':
      case 'eth_requestAccounts':
        return [session.address];
      case 'eth_chainId':
        return toHex(chain.id);
      case 'net_version':
        return String(chain.id);
      case 'personal_sign': {
        const p = params as [string, Address];
        return kernelClient.signMessage({
          account: p[1],
          message: { raw: p[0] as `0x${string}` },
        });
      }
      case 'eth_signTypedData_v4': {
        const p = params as [Address, string];
        return kernelClient.signTypedData(JSON.parse(p[1]));
      }
      case 'eth_sendTransaction': {
        const p = params as [
          { to: Address; data?: `0x${string}`; value?: `0x${string}` }
        ];
        const tx = p[0];
        return kernelClient.sendTransaction({
          to: tx.to,
          data: tx.data ?? '0x',
          value: tx.value ? BigInt(tx.value) : BigInt(0),
        });
      }
      case 'wallet_sendCalls': {
        const p = params as [
          {
            calls: { to: Address; data?: `0x${string}`; value?: `0x${string}` }[];
          }
        ];
        return kernelClient.sendTransaction({
          calls: p[0].calls.map((c) => ({
            to: c.to,
            data: c.data ?? '0x',
            value: c.value ? BigInt(c.value) : BigInt(0),
          })),
        });
      }
      case 'wallet_switchEthereumChain': {
        const p = params as [{ chainId: string }];
        if (parseInt(p[0].chainId, 16) !== chain.id) {
          throw new Error(
            `poidh passkey accounts live on ${chain.name} (${chain.id})`
          );
        }
        return null;
      }
      default:
        return publicClient.request(args);
    }
  }) as unknown as EIP1193Provider['request'];

  return {
    request,
    on: () => {},
    removeListener: () => {},
  } as unknown as EIP1193Provider;
}

/**
 * wagmi v2 connector for the poidh passkey smart account. With a
 * stored session it restores silently; without one it runs the
 * WebAuthn register ceremony (asking for a passkey name) so both the
 * rainbowkit modal and the standalone button share one flow.
 */
export function zerodevPasskeyConnector() {
  let session: PasskeySession | null = null;
  let provider: EIP1193Provider | null = null;

  return createConnector<EIP1193Provider>((config) => ({
    id: 'zerodev-passkey',
    name: 'Passkey (smart account)',
    type: 'zerodev-passkey',

    async connect() {
      session = readStoredSession();
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
      const kernelClient = await kernelClientForSession(session);
      provider = kernelToEip1193(kernelClient, session);
      const chainId = ZERODEV_DESTINATION_CHAIN.id;
      const accounts = [session.address] as const;
      config.emitter.emit('connect', { accounts, chainId });
      return { accounts, chainId };
    },

    async disconnect() {
      clearStoredSession();
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
        const kernelClient = await kernelClientForSession(session);
        provider = kernelToEip1193(kernelClient, session);
      }
      return provider as EIP1193Provider;
    },

    async isAuthorized() {
      session = readStoredSession();
      return Boolean(session) && zerodevConfigured();
    },

    onAccountsChanged() {},
    onChainChanged() {},
    onDisconnect() {
      session = null;
      provider = null;
    },
  }));
}
