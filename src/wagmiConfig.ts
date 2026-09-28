'use client';

import clientEnv from '@/utils/clientEnv';
import {
  connectorsForWallets,
  getDefaultWallets,
  type Wallet,
} from '@rainbow-me/rainbowkit';
import { createConfig, http } from 'wagmi';
import { arbitrum, base, degen, mainnet } from 'wagmi/chains';
import { zerodevPasskeyConnector } from '@/zerodev/zerodevConnector';

const appName = 'poidh';
const projectId = '784d6347a43d3f6e89f58b177f1b27f2';

const PASSKEY_ICON =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#42d77b" stroke-width="2"><circle cx="8" cy="15" r="4"/><path d="m11 12 9-9"/><path d="m15 6 3 3"/></svg>'
  );

/**
 * Passkey smart-account wallet, listed in the rainbowkit modal next to
 * the extension wallets. Powered by ZeroDev Kernel v3.1 on Arbitrum.
 */
const passkeyWallet = (): Wallet => ({
  id: 'zerodev-passkey',
  name: 'Passkey (smart account)',
  iconUrl: PASSKEY_ICON,
  iconBackground: '#03180f',
  createConnector:
    (walletDetails) =>
    (config) =>
      Object.assign(zerodevPasskeyConnector()(config), walletDetails),
});

const { wallets: defaultWallets } = getDefaultWallets({ appName, projectId });

const connectors = connectorsForWallets(
  [
    ...defaultWallets,
    { groupName: 'Smart accounts', wallets: [passkeyWallet] },
  ],
  { appName, projectId }
);

export const config = createConfig({
  chains: [mainnet, degen, arbitrum, base],
  transports: {
    [degen.id]: http(clientEnv.DEGEN_RPC_URL),
    [arbitrum.id]: http(clientEnv.ARBITRUM_RPC_URL),
    [base.id]: http(clientEnv.BASE_RPC_URL),
    [mainnet.id]: http(clientEnv.MAINNET_RPC_URL),
  },
  connectors,
  ssr: true,
});
