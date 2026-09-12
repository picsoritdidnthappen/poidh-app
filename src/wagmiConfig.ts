'use client';

import clientEnv from '@/utils/clientEnv';
import {
  getDefaultConfig,
  getDefaultWallets,
  Wallet,
} from '@rainbow-me/rainbowkit';
import { http } from 'viem';
import { arbitrum, base, degen, mainnet } from 'wagmi/chains';
import { zeroDevWallet } from '@zerodev/wallet-react';

const { wallets } = getDefaultWallets();

type WalletDetails = Parameters<Wallet['createConnector']>[0];
type ConnectorConfig = Parameters<ReturnType<Wallet['createConnector']>>[0];

export const zeroDevRainbowWallet = (): Wallet => ({
  id: 'zerodev',
  name: 'ZeroDev',
  iconUrl: '/images/zerodev-logo.svg',
  iconBackground: '#19110B',
  createConnector:
    (walletDetails: WalletDetails) => (config: ConnectorConfig) => {
      const baseConnector = zeroDevWallet({
        projectId: clientEnv.ZERODEV_PROJECT_ID || '',
        chains: [arbitrum, base, degen, mainnet],
      })(config);

      const originalConnect = baseConnector.connect.bind(baseConnector);
      const originalGetProvider =
        baseConnector.getProvider?.bind(baseConnector);

      return {
        ...baseConnector,
        ...walletDetails,
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
                await new Promise<void>((resolve, reject) => {
                  window.dispatchEvent(
                    new CustomEvent('zerodev-request-approval', {
                      detail: {
                        type: 'transaction',
                        tx,
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
          if (!state?.eoaAccount) {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('open-zerodev-auth'));
            }
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
  chains: [mainnet, degen, arbitrum, base],
  wallets: [
    {
      groupName: 'Smart Accounts',
      wallets: [zeroDevRainbowWallet],
    },
    ...wallets,
  ],
  transports: {
    [degen.id]: http(clientEnv.DEGEN_RPC_URL),
    [arbitrum.id]: http(clientEnv.ARBITRUM_RPC_URL),
    [base.id]: http(clientEnv.BASE_RPC_URL),
    [mainnet.id]: http(clientEnv.MAINNET_RPC_URL),
  },
  ssr: true,
});
