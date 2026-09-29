'use client';

import clientEnv from '@/utils/clientEnv';
import {
  connectorsForWallets,
  getDefaultWallets,
  type Wallet,
} from '@rainbow-me/rainbowkit';
import { createConfig, http } from 'wagmi';
import { arbitrum, base, degen, mainnet } from 'wagmi/chains';
import {
  zerodevPasskeyConnector,
  zerodevSocialConnector,
} from '@/zerodev/zerodevConnector';
import { zerodevConfigured } from '@/zerodev/config';

const appName = 'poidh';
const projectId = '784d6347a43d3f6e89f58b177f1b27f2';

const PASSKEY_ICON =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#42d77b" stroke-width="2"><circle cx="8" cy="15" r="4"/><path d="m11 12 9-9"/><path d="m15 6 3 3"/></svg>'
  );

const GOOGLE_ICON =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.3H12v4.5h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.1.1 3.5 2.7.2.1c2.2-2 3.8-5.1 3.8-8.9z"/><path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-.1.1-3.7 2.9v.1C3.5 21.3 7.5 24 12 24z"/><path fill="#FBBC05" d="M5.2 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.7.4-2.4l-.1-.1-3.7-2.9-.1.1C.5 8.3 0 10.1 0 12s.5 3.7 1.3 5.3l3.9-2.9z"/><path fill="#EA4335" d="M12 4.7c1.8 0 3 .8 3.7 1.4l3.3-3.2C17.9 1.1 15.2 0 12 0 7.5 0 3.5 2.7 1.3 6.7l3.9 3c1-2.9 3.7-5 6.8-5z"/></svg>'
  );

/**
 * Passkey smart-account wallet, listed in the RainbowKit modal next to
 * the extension wallets. Powered by a ZeroDev Kernel v3.1 account on
 * Arbitrum, authenticated by a WebAuthn passkey — no seed phrase.
 */
const passkeyWallet = (): Wallet => ({
  id: 'zerodev-passkey',
  name: 'Passkey (smart account)',
  iconUrl: PASSKEY_ICON,
  iconBackground: '#03180f',
  createConnector: (walletDetails) => (config) =>
    Object.assign(zerodevPasskeyConnector()(config), walletDetails),
});

/**
 * Google social smart-account wallet. Same Kernel v3.1 account model on
 * Arbitrum, authenticated via Google OAuth (ZeroDev social validator) —
 * no seed phrase, no extension.
 */
const socialWallet = (): Wallet => ({
  id: 'zerodev-social',
  name: 'Google (smart account)',
  iconUrl: GOOGLE_ICON,
  iconBackground: '#ffffff',
  createConnector: (walletDetails) => (config) =>
    Object.assign(zerodevSocialConnector()(config), walletDetails),
});

const { wallets: defaultWallets } = getDefaultWallets({ appName, projectId });

const smartAccountWallets = zerodevConfigured()
  ? [passkeyWallet, socialWallet]
  : [];

const connectors = connectorsForWallets(
  [
    ...defaultWallets,
    ...(smartAccountWallets.length
      ? [{ groupName: 'Smart accounts', wallets: smartAccountWallets }]
      : []),
  ],
  { appName, projectId }
);

export const config = createConfig({
  connectors,
  chains: [mainnet, degen, arbitrum, base],
  transports: {
    [degen.id]: http(clientEnv.DEGEN_RPC_URL),
    [arbitrum.id]: http(clientEnv.ARBITRUM_RPC_URL),
    [base.id]: http(clientEnv.BASE_RPC_URL),
    [mainnet.id]: http(clientEnv.MAINNET_RPC_URL),
  },
  ssr: true,
});
