'use client';

import { createKernelAccount, createKernelAccountClient } from '@zerodev/sdk';
import { KERNEL_V3_1 } from '@zerodev/sdk/constants';
import {
  deserializePasskeyValidator,
  PasskeyValidatorContractVersion,
  toPasskeyValidator,
  toWebAuthnKey,
  WebAuthnMode,
} from '@zerodev/passkey-validator';
import { entryPoint07Address } from 'viem/account-abstraction';
import {
  createPublicClient,
  http,
  type Address,
  type Chain,
  type PublicClient,
} from 'viem';
import {
  PASSKEY_SESSION_KEY,
  ZERODEV_BUNDLER_URL,
  ZERODEV_DESTINATION_CHAIN,
  ZERODEV_PASSKEY_SERVER_URL,
  zerodevConfigured,
} from '@/zerodev/config';

export interface PasskeySession {
  /** smart-account address on the destination chain */
  address: Address;
  /** serialized validator — restores the session without a new ceremony */
  serializedValidator: string;
}

export const PASSKEY_ENTRY_POINT = {
  address: entryPoint07Address,
  version: '0.7' as const,
};

export function publicClientFor(chain: Chain): PublicClient {
  return createPublicClient({ chain, transport: http() }) as PublicClient;
}

function requireConfigured(): void {
  if (!zerodevConfigured()) {
    throw new Error(
      'NEXT_PUBLIC_ZERODEV_PROJECT_ID is not set — passkey login is unavailable'
    );
  }
}

/**
 * Run a WebAuthn register/login ceremony against the ZeroDev passkey
 * server and derive the Kernel v3.1 smart account on Arbitrum.
 */
export async function createPasskeySmartAccount(
  passkeyName: string,
  mode: WebAuthnMode = WebAuthnMode.Register
): Promise<PasskeySession> {
  requireConfigured();
  const chain = ZERODEV_DESTINATION_CHAIN;
  const client = publicClientFor(chain);

  const webAuthnKey = await toWebAuthnKey({
    passkeyName,
    passkeyServerUrl: ZERODEV_PASSKEY_SERVER_URL,
    mode,
  });

  const passkeyValidator = await toPasskeyValidator(client, {
    webAuthnKey,
    entryPoint: PASSKEY_ENTRY_POINT,
    kernelVersion: KERNEL_V3_1,
    validatorContractVersion: PasskeyValidatorContractVersion.V0_0_2_UNPATCHED,
  });

  const account = await createKernelAccount(client, {
    plugins: { sudo: passkeyValidator },
    entryPoint: PASSKEY_ENTRY_POINT,
    kernelVersion: KERNEL_V3_1,
  });

  const session: PasskeySession = {
    address: account.address,
    serializedValidator: passkeyValidator.getSerializedData(),
  };
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(PASSKEY_SESSION_KEY, JSON.stringify(session));
  }
  return session;
}

export function readPasskeySession(): PasskeySession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PASSKEY_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PasskeySession;
    return parsed?.address ? parsed : null;
  } catch {
    return null;
  }
}

export function clearPasskeySession(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(PASSKEY_SESSION_KEY);
  }
}

/**
 * Kernel account client for an existing passkey session. Signs and sends
 * ERC-4337 user operations through the ZeroDev bundler. No paymaster is
 * attached — users pay gas from the smart account itself, so the feature
 * needs no spending policy from the maintainer.
 */
export async function kernelClientForPasskeySession(session: PasskeySession) {
  const chain = ZERODEV_DESTINATION_CHAIN;
  const client = publicClientFor(chain);

  const passkeyValidator = await deserializePasskeyValidator(client, {
    serializedData: session.serializedValidator,
    entryPoint: PASSKEY_ENTRY_POINT,
    kernelVersion: KERNEL_V3_1,
  });

  const account = await createKernelAccount(client, {
    plugins: { sudo: passkeyValidator },
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
