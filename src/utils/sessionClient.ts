import { TRPCClientError } from '@trpc/client';

/**
 * Thrown by withSession when the user closes the sign-in prompt instead of
 * signing in. Callers can ignore it, since the user chose not to continue.
 */
export class SignInCancelledError extends Error {
  constructor() {
    super('Sign-in was cancelled');
    this.name = 'SignInCancelledError';
  }
}

/**
 * Whether the server turned a call away because there's no valid session.
 */
export function isUnauthorizedError(error: unknown) {
  return (
    error instanceof TRPCClientError && error.data?.code === 'UNAUTHORIZED'
  );
}

/**
 * Runs an action that needs a session. Asks the user to sign in first if
 * they aren't, and if the server says the session has expired partway
 * through, asks them to sign in again and retries the action once.
 */
export async function runWithSession<T>(
  action: () => Promise<T>,
  {
    isSignedIn,
    requestSignIn,
    onSessionExpired,
  }: {
    isSignedIn: boolean;
    // eslint-disable-next-line no-unused-vars
    requestSignIn: (options: { expired: boolean }) => Promise<void>;
    onSessionExpired: () => void;
  }
): Promise<T> {
  if (!isSignedIn) {
    await requestSignIn({ expired: false });
  }

  try {
    return await action();
  } catch (error) {
    if (!isUnauthorizedError(error)) {
      throw error;
    }

    onSessionExpired();
    await requestSignIn({ expired: true });

    return action();
  }
}
