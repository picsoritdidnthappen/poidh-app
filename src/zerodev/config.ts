import { arbitrum } from 'wagmi/chains';

/**
 * ZeroDev smart-account integration config.
 *
 * The destination chain for passkey smart accounts and cross-chain
 * deposits is Arbitrum One, per the poidh.xyz roadmap request
 * ("ideally live on arbitrum under the hood as the destination chain").
 */
export const ZERODEV_DESTINATION_CHAIN = arbitrum;

/** ZeroDev project id — get one free at https://dashboard.zerodev.app */
export const ZERODEV_PROJECT_ID =
  process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID ?? '';

/** ZeroDev passkey server (WebAuthn register/login ceremonies). */
export const ZERODEV_PASSKEY_SERVER_URL = ZERODEV_PROJECT_ID
  ? `https://passkeys.zerodev.app/api/v3/${ZERODEV_PROJECT_ID}`
  : '';

/** ZeroDev bundler + paymaster RPCs (v3 API path). */
export const ZERODEV_BUNDLER_URL = ZERODEV_PROJECT_ID
  ? `https://rpc.zerodev.app/api/v3/${ZERODEV_PROJECT_ID}/chain/${ZERODEV_DESTINATION_CHAIN.id}`
  : '';
export const ZERODEV_PAYMASTER_URL = ZERODEV_BUNDLER_URL;

/** localStorage key for the serialized passkey validator (session restore). */
export const PASSKEY_SESSION_KEY = 'poidh:zerodev:passkey-session';

/** Relay (relay.link) quote API for cross-chain deposits. */
export const RELAY_QUOTE_URL = 'https://api.relay.link/quote';

/** Chains a deposit may originate from (all chains poidh already supports). */
export const DEPOSIT_SOURCE_CHAIN_IDS = [1, 8453, 42161, 666666666] as const;

export function zerodevConfigured(): boolean {
  return Boolean(ZERODEV_PROJECT_ID);
}
