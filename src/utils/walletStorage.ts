import {
  cookieToInitialState,
  createStorage,
  type Config,
  type State,
} from 'wagmi';

import { WALLET_COOKIE_NAME } from '@/utils/walletCookieName';

// wagmi adds '.store' to this for the key of its store.
const STORAGE_PREFIX = 'wagmi';

// wagmi's own cookieStorage writes a session cookie, which is gone after a
// browser restart. Each write of the wagmi store renews the 7 days.
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getLocalStorage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function readCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const pair = document.cookie
    .split('; ')
    .find((item) => item.startsWith(`${name}=`));
  if (!pair) return null;
  try {
    return decodeURIComponent(pair.substring(name.length + 1));
  } catch {
    return null;
  }
}

function writeCookie(name: string, value: string | null) {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:' ? ';secure' : '';
  document.cookie =
    value === null
      ? `${name}=;max-age=0;path=/;samesite=Lax${secure}`
      : `${name}=${encodeURIComponent(
          value
        )};max-age=${COOKIE_MAX_AGE_SECONDS};path=/;samesite=Lax${secure}`;
}

function hasConnection(serializedStore: string) {
  try {
    const connections = JSON.parse(serializedStore)?.state?.connections?.value;
    return Array.isArray(connections) && connections.length > 0;
  } catch {
    return false;
  }
}

// localStorage stays the source of truth, so wallets connected before this
// change still reconnect. Only the wagmi store is copied to a cookie, because
// that is all the server needs.
export const walletStorage = createStorage({
  key: STORAGE_PREFIX,
  storage: {
    getItem(key) {
      let value: string | null = null;
      try {
        value = getLocalStorage()?.getItem(key) ?? null;
      } catch {
        // fall through to the cookie
      }
      if (value === null && key === WALLET_COOKIE_NAME) {
        return readCookie(key);
      }
      return value;
    },
    setItem(key, value) {
      try {
        getLocalStorage()?.setItem(key, value);
      } catch {
        // QuotaExceededError, SecurityError, etc.
      }
      // A disconnected wallet has nothing for the server to render, so it
      // gets no cookie.
      if (key === WALLET_COOKIE_NAME) {
        writeCookie(key, hasConnection(value) ? value : null);
      }
    },
    removeItem(key) {
      try {
        getLocalStorage()?.removeItem(key);
      } catch {
        // SecurityError
      }
      if (key === WALLET_COOKIE_NAME) writeCookie(key, null);
    },
  },
});

// `value` is the decoded cookie value. A cookie that can't be read gives the
// disconnected state, the same as no cookie.
export function walletCookieToInitialState(
  config: Config,
  value: string | undefined
): State | undefined {
  if (!value) return undefined;
  try {
    const state = cookieToInitialState(
      config,
      `${WALLET_COOKIE_NAME}=${value}`
    );
    if (!state || !(state.connections instanceof Map)) return undefined;
    return state;
  } catch {
    return undefined;
  }
}
