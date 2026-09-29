import { arbitrum } from 'wagmi/chains';

/**
 * ZeroDev smart-account integration config.
 *
 * Destination chain for smart accounts and cross-chain deposits is
 * Arbitrum One, per the bounty ("ideally live on arbitrum ... as the
 * destination chain").
 */
export const ZERODEV_DESTINATION_CHAIN = arbitrum;

/** ZeroDev project id — create a free project at https://dashboard.zerodev.app */
export const ZERODEV_PROJECT_ID =
  process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID ?? '';

/** ZeroDev passkey server (WebAuthn register/login ceremonies). */
export const ZERODEV_PASSKEY_SERVER_URL = ZERODEV_PROJECT_ID
  ? `https://passkeys.zerodev.app/api/v3/${ZERODEV_PROJECT_ID}`
  : '';

/** ZeroDev bundler + paymaster RPCs (v3 API path, entrypoint 0.7). */
export const ZERODEV_BUNDLER_URL = ZERODEV_PROJECT_ID
  ? `https://rpc.zerodev.app/api/v3/${ZERODEV_PROJECT_ID}/chain/${ZERODEV_DESTINATION_CHAIN.id}`
  : '';
export const ZERODEV_PAYMASTER_URL = ZERODEV_BUNDLER_URL;

/** localStorage keys for persisted smart-account sessions. */
export const PASSKEY_SESSION_KEY = 'poidh:zerodev:passkey-session';
export const SOCIAL_SESSION_KEY = 'poidh:zerodev:social-session';
/** sessionStorage flag set by /social-callback so the app auto-connects. */
export const SOCIAL_PENDING_KEY = 'poidh:zerodev:social-pending';

/** Path (under the app origin) that receives the Google OAuth redirect. */
export const SOCIAL_CALLBACK_PATH = '/social-callback';

/** Relay (relay.link) quote API for cross-chain deposits. */
export const RELAY_QUOTE_URL = 'https://api.relay.link/quote';

/** Chains a deposit may originate from (every chain poidh already supports). */
export const DEPOSIT_SOURCE_CHAIN_IDS = [1, 8453, 42161, 666666666] as const;

export function zerodevConfigured(): boolean {
  return Boolean(ZERODEV_PROJECT_ID);
}

/**
 * Absolute OAuth callback URL for the current origin. Social login in
 * ZeroDev dev mode only works on localhost; production needs Social Auth
 * approved on the ZeroDev dashboard (Growth plan + own Google client).
 */
export function socialCallbackUrl(): string {
  if (typeof window === 'undefined') return SOCIAL_CALLBACK_PATH;
  return `${window.location.origin}${SOCIAL_CALLBACK_PATH}`;
}
