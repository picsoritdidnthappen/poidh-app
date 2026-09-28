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
  /** serialized validator data; restores the session without a new ceremony */
  serializedValidator: string;
}

const ENTRY_POINT = {
  address: entryPoint07Address,
  version: '0.7' as const,
};

function publicClientFor(chain: Chain): PublicClient {
  return createPublicClient({ chain, transport: http() }) as PublicClient;
}

/**
 * Run a WebAuthn register/login ceremony against the ZeroDev passkey
 * server and derive the Kernel v3.1 smart account on the destination
 * chain (Arbitrum).
 */
export async function createPasskeySmartAccount(
  passkeyName: string,
  mode: WebAuthnMode = WebAuthnMode.Register
): Promise<PasskeySession> {
  if (!zerodevConfigured()) {
    throw new Error(
      'NEXT_PUBLIC_ZERODEV_PROJECT_ID is not set; passkey login is unavailable'
    );
  }
  const chain = ZERODEV_DESTINATION_CHAIN;
  const client = publicClientFor(chain);

  const webAuthnKey = await toWebAuthnKey({
    passkeyName,
    passkeyServerUrl: ZERODEV_PASSKEY_SERVER_URL,
    mode,
  });

  const passkeyValidator = await toPasskeyValidator(client, {
    webAuthnKey,
    entryPoint: ENTRY_POINT,
    kernelVersion: KERNEL_V3_1,
    // kernel 0.3.0/0.3.1 pair with the 0.0.2 validator contract
    validatorContractVersion: PasskeyValidatorContractVersion.V0_0_2_UNPATCHED,
  });

  const account = await createKernelAccount(client, {
    plugins: { sudo: passkeyValidator },
    entryPoint: ENTRY_POINT,
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

export function readStoredSession(): PasskeySession | null {
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

export function clearStoredSession(): void {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(PASSKEY_SESSION_KEY);
  }
}

/**
 * Kernel account client for an existing session. Signs and sends
 * ERC-4337 user operations through the ZeroDev bundler. No paymaster
 * is attached: users pay gas from the smart account itself, so the
 * feature needs no ZeroDev spending policy from the maintainer —
 * sponsorship can be layered on later via the paymaster URL in config.
 */
export async function kernelClientForSession(session: PasskeySession) {
  const chain = ZERODEV_DESTINATION_CHAIN;
  const client = publicClientFor(chain);

  const passkeyValidator = await deserializePasskeyValidator(client, {
    serializedData: session.serializedValidator,
    entryPoint: ENTRY_POINT,
    kernelVersion: KERNEL_V3_1,
  });

  const account = await createKernelAccount(client, {
    plugins: { sudo: passkeyValidator },
    entryPoint: ENTRY_POINT,
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
