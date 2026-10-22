/**
 * How long a sign-in lasts. Expiry is worked out from each session's
 * created_at, so changing this also applies to sessions that already exist.
 */
export const SESSION_TTL_DAYS = 30;
export const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

/**
 * How long the user has to sign the sign-in message after asking for a nonce.
 */
export const NONCE_TTL_MS = 10 * 60 * 1000;

export const SESSION_COOKIE_NAME = 'poidh_session';

/**
 * Hosts a sign-in can happen on: prod, staging, and the URLs Vercel sets for
 * the current deploy (its own URL, its branch URL and the production domain).
 * Vercel sets these as bare hostnames, so they compare directly.
 */
const ALLOWED_HOSTS = [
  'poidh.xyz',
  'staging.poidh.xyz',
  process.env.VERCEL_URL,
  process.env.VERCEL_BRANCH_URL,
  process.env.VERCEL_PROJECT_PRODUCTION_URL,
].filter(Boolean);

const ALLOW_LOCALHOST = process.env.NODE_ENV === 'development';

/**
 * Whether a sign-in request that came in on this host should be accepted.
 * The sign-in message must name the same host, so this stops a message signed
 * for some other site from being used here. Localhost is allowed in dev only.
 */
export function isAllowedHost(host: string) {
  if (ALLOW_LOCALHOST && /^localhost(:\d+)?$/.test(host)) {
    return true;
  }

  return ALLOWED_HOSTS.includes(host);
}
