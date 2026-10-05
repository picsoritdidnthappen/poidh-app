'use client';

import clientEnv from '@/utils/clientEnv';
import {
  getDefaultConfig,
  getDefaultWallets,
  Wallet,
} from '@rainbow-me/rainbowkit';
import { http } from 'viem';
import { arbitrum, base, mainnet } from 'wagmi/chains';
import { zeroDevWallet } from '@zerodev/wallet-react';

const { wallets } = getDefaultWallets();

type WalletDetails = Parameters<Wallet['createConnector']>[0];
type ConnectorConfig = Parameters<ReturnType<Wallet['createConnector']>>[0];

export const zeroDevRainbowWallet = (): Wallet => ({
  id: 'zerodev-wallet',
  name: 'Create wallet',
  iconUrl: '/images/create-wallet-icon.png',
  iconBackground: '#19110B',
  createConnector:
    (walletDetails: WalletDetails) => (config: ConnectorConfig) => {
      if (!clientEnv.ZERODEV_PROJECT_ID) {
        throw new Error(
          'Missing NEXT_PUBLIC_ZERODEV_PROJECT_ID: set it to your ZeroDev project ID.'
        );
      }
      
      // ZeroDev-specific RPCs.
      // These are used only by the ZeroDev connector. Normal poidh wallets
      // continue using the existing Wagmi transports below.
      const zeroDevRpcFor = (chainId: number) =>
        `https://rpc.zerodev.app/api/v3/${clientEnv.ZERODEV_PROJECT_ID}/chain/${chainId}`;
      
      const zeroDevArbitrum = {
        ...arbitrum,
        rpcUrls: {
          ...arbitrum.rpcUrls,
          default: {
            http: [zeroDevRpcFor(arbitrum.id)],
          },
        },
      };
      
      const zeroDevBase = {
        ...base,
        rpcUrls: {
          ...base.rpcUrls,
          default: {
            http: [zeroDevRpcFor(base.id)],
          },
        },
      };
      
      const zeroDevMainnet = {
        ...mainnet,
        rpcUrls: {
          ...mainnet.rpcUrls,
          default: {
            http: [zeroDevRpcFor(mainnet.id)],
          },
        },
      };
      
      const baseConnector = zeroDevWallet({
        projectId: clientEnv.ZERODEV_PROJECT_ID,
        chains: [zeroDevArbitrum, zeroDevBase, zeroDevMainnet],
        mode: '4337',
      })(config);

      const originalConnect = baseConnector.connect.bind(baseConnector);
      const originalGetProvider =
        baseConnector.getProvider?.bind(baseConnector);

      return {
        ...baseConnector,
        ...walletDetails,
        id: 'zerodev-wallet',
        getProvider: async (params?: Record<string, unknown>) => {
          if (!originalGetProvider) return null;
          const provider = (await originalGetProvider(params)) as {
            // eslint-disable-next-line no-unused-vars
            request: (args: {
              method: string;
              params?: unknown[];
            }) => Promise<unknown>;
            __poidhApprovalWrapped?: boolean;
          } | null;

          if (provider && !provider.__poidhApprovalWrapped) {
            const originalRequest = provider.request.bind(provider);
            provider.request = async (args: {
              method: string;
              params?: unknown[];
            }) => {
              if (
                typeof window !== 'undefined' &&
                (args.method === 'eth_sendTransaction' ||
                  args.method === 'wallet_sendTransaction')
              ) {
                const tx = (args.params as Record<string, unknown>[])?.[0];

                // Ensure chainId is accurately populated
                let effectiveChainId = tx?.chainId;
                if (!effectiveChainId) {
                  try {
                    const currentHex = (await originalRequest({
                      method: 'eth_chainId',
                    })) as string;
                    effectiveChainId =
                      typeof currentHex === 'string'
                        ? parseInt(currentHex, 16)
                        : Number(currentHex);
                  } catch {
                    // ignore
                  }
                }

                const enrichedTx = {
                  ...tx,
                  chainId: effectiveChainId,
                };

                await new Promise<void>((resolve, reject) => {
                  window.dispatchEvent(
                    new CustomEvent('zerodev-request-approval', {
                      detail: {
                        type: 'transaction',
                        tx: enrichedTx,
                        resolve,
                        reject,
                      },
                    })
                  );
                });
              } else if (
                typeof window !== 'undefined' &&
                args.method === 'personal_sign'
              ) {
                const message = (args.params as string[])?.[0];
                await new Promise<void>((resolve, reject) => {
                  window.dispatchEvent(
                    new CustomEvent('zerodev-request-approval', {
                      detail: {
                        type: 'signature',
                        message,
                        resolve,
                        reject,
                      },
                    })
                  );
                });
              } else if (args.method === 'eth_getCode') {
                try {
                  const chainIdHex = (await originalRequest({
                    method: 'eth_chainId',
                  })) as string;
                  const chainId =
                    typeof chainIdHex === 'string'
                      ? parseInt(chainIdHex, 16)
                      : Number(chainIdHex);
                  const rpcMap: Record<number, string> = {
                    [arbitrum.id]: zeroDevRpcFor(arbitrum.id),
                    [base.id]: zeroDevRpcFor(base.id),
                    [mainnet.id]: zeroDevRpcFor(mainnet.id),
                  };
                  
                  const rpc = rpcMap[chainId];
                  
                  if (!rpc) {
                    return '0x';
                  }
                  const res = await fetch(rpc, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      jsonrpc: '2.0',
                      id: 1,
                      method: 'eth_getCode',
                      params: args.params,
                    }),
                  });
                  const data = await res.json();
                  return data.result || '0x';
                } catch {
                  return '0x';
                }
              }

              return await originalRequest(args);
            };
            provider.__poidhApprovalWrapped = true;
          }

          return provider;
        },
        connect: async (params?: Record<string, unknown>) => {
          const storeGetter = (
            baseConnector as unknown as {
              getStore?: () => Promise<{
                getState?: () => { eoaAccount?: unknown };
              }>;
            }
          ).getStore;
          const store = storeGetter ? await storeGetter() : null;
          const state = store?.getState?.();
          if (!state?.eoaAccount && !params?.isReconnecting) {
            await new Promise<void>((resolve, reject) => {
              const onAuthSuccess = () => {
                cleanup();
                resolve();
              };
              const onAuthCancel = () => {
                cleanup();
                reject(new Error('User cancelled ZeroDev authentication'));
              };
              const cleanup = () => {
                window.removeEventListener(
                  'zerodev-auth-success',
                  onAuthSuccess
                );
                window.removeEventListener('zerodev-auth-cancel', onAuthCancel);
              };
              window.addEventListener('zerodev-auth-success', onAuthSuccess);
              window.addEventListener('zerodev-auth-cancel', onAuthCancel);
              window.dispatchEvent(new CustomEvent('open-zerodev-auth'));
            });
          }
          return await originalConnect(params);
        },
      };
    },
});

export const config = getDefaultConfig({
  appName: 'poidh',
  projectId: '784d6347a43d3f6e89f58b177f1b27f2',
  chains: [mainnet, arbitrum, base],
  wallets: [
    ...(clientEnv.ZERODEV_PROJECT_ID
      ? [
          {
            groupName: 'No wallet?',
            wallets: [zeroDevRainbowWallet],
          },
        ]
      : []),
    ...wallets,
  ],
  transports: {
    [arbitrum.id]: http(clientEnv.ARBITRUM_RPC_URL),
    [base.id]: http(clientEnv.BASE_RPC_URL),
    [mainnet.id]: http(clientEnv.MAINNET_RPC_URL),
  },
});
