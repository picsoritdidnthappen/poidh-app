'use client';

import { createKernelAccount, createKernelAccountClient } from '@zerodev/sdk';
import { KERNEL_V3_1 } from '@zerodev/sdk/constants';
import {
  getSocialValidator,
  initiateLogin,
  isAuthorized,
  logout,
} from '@zerodev/social-validator';
import {
  SOCIAL_PENDING_KEY,
  SOCIAL_SESSION_KEY,
  ZERODEV_BUNDLER_URL,
  ZERODEV_DESTINATION_CHAIN,
  ZERODEV_PROJECT_ID,
  socialCallbackUrl,
  zerodevConfigured,
} from '@/zerodev/config';
import {
  PASSKEY_ENTRY_POINT,
  publicClientFor,
} from '@/zerodev/passkeySmartAccount';
import { http, type Address } from 'viem';

export interface SocialSession {
  /** smart-account address on the destination chain */
  address: Address;
  /** which social provider authenticated this session */
  provider: 'google';
}

/**
 * Is there a live Magic/OAuth session for this ZeroDev project?
 * True on the /social-callback page after the Google redirect.
 */
export async function socialLoginAuthorized(): Promise<boolean> {
  if (!zerodevConfigured()) return false;
  try {
    return await isAuthorized({ projectId: ZERODEV_PROJECT_ID });
  } catch {
    return false;
  }
}

/**
 * Kick off Google OAuth. This performs a FULL-PAGE redirect to Google
 * (Magic's loginWithRedirect) — the promise never resolves; the user
 * comes back at /social-callback.
 */
export async function startGoogleLogin(): Promise<never> {
  if (!zerodevConfigured()) {
    throw new Error(
      'NEXT_PUBLIC_ZERODEV_PROJECT_ID is not set — social login is unavailable'
    );
  }
  await initiateLogin({
    socialProvider: 'google',
    oauthCallbackUrl: socialCallbackUrl(),
    projectId: ZERODEV_PROJECT_ID,
  });
  // Redirect navigation tears the page down; never resolves in practice.
  return new Promise<never>(() => {
    // Full-page redirect tears this page down; the executor never runs.
  });
}

/**
 * Build (or rebuild) the Kernel v3.1 smart account from the live social
 * session. The social validator has no serialize API — Magic persists its
 * own session, so we just re-derive the deterministic account address.
 */
export async function createSocialSmartAccount(): Promise<SocialSession> {
  if (!zerodevConfigured()) {
    throw new Error(
      'NEXT_PUBLIC_ZERODEV_PROJECT_ID is not set — social login is unavailable'
    );
  }
  const chain = ZERODEV_DESTINATION_CHAIN;
  const client = publicClientFor(chain);

  const socialValidator = await getSocialValidator(client, {
    entryPoint: PASSKEY_ENTRY_POINT,
    kernelVersion: KERNEL_V3_1,
    projectId: ZERODEV_PROJECT_ID,
  });

  const account = await createKernelAccount(client, {
    plugins: { sudo: socialValidator },
    entryPoint: PASSKEY_ENTRY_POINT,
    kernelVersion: KERNEL_V3_1,
  });

  const session: SocialSession = {
    address: account.address,
    provider: 'google',
  };
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SOCIAL_SESSION_KEY, JSON.stringify(session));
  }
  return session;
}

export function readSocialSession(): SocialSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SOCIAL_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SocialSession;
    return parsed?.address ? parsed : null;
  } catch {
    return null;
  }
}

export function clearSocialSession(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(SOCIAL_SESSION_KEY);
    window.sessionStorage.removeItem(SOCIAL_PENDING_KEY);
  }
}

export function markSocialPending(): void {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(SOCIAL_PENDING_KEY, '1');
  }
}

export function consumeSocialPending(): boolean {
  if (typeof window === 'undefined') return false;
  const pending = window.sessionStorage.getItem(SOCIAL_PENDING_KEY) === '1';
  if (pending) window.sessionStorage.removeItem(SOCIAL_PENDING_KEY);
  return pending;
}

/** Kernel account client for a social session (same bundler as passkey). */
export async function kernelClientForSocialSession(session: SocialSession) {
  const chain = ZERODEV_DESTINATION_CHAIN;
  const client = publicClientFor(chain);

  const socialValidator = await getSocialValidator(client, {
    entryPoint: PASSKEY_ENTRY_POINT,
    kernelVersion: KERNEL_V3_1,
    projectId: ZERODEV_PROJECT_ID,
  });

  const account = await createKernelAccount(client, {
    plugins: { sudo: socialValidator },
    entryPoint: PASSKEY_ENTRY_POINT,
    kernelVersion: KERNEL_V3_1,
    address: session.address,
  });

  return createKernelAccountClient({
    account,
    chain,
    bundlerTransport: http(ZERODEV_BUNDLER_URL),
    client,
  });
}

/** Log out of the Magic social session and drop the local session. */
export async function logoutSocial(): Promise<void> {
  try {
    if (zerodevConfigured()) await logout({ projectId: ZERODEV_PROJECT_ID });
  } catch {
    // best-effort: still clear local state below
  }
  clearSocialSession();
}
