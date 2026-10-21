'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { base } from 'viem/chains';
import { createSiweMessage } from 'viem/siwe';
import { useAccount, useAccountEffect, useSignMessage } from 'wagmi';
import { trpc } from '@/trpc/client';
import { NONCE_TTL_MS } from '@/utils/authConfig';
import SignInModal from './SignInModal';
import { SignInCancelledError, runWithSession } from '@/utils/sessionClient';

const SIGN_IN_STATEMENT =
  'Sign in to poidh to comment and vote. This is free and does not send a transaction.';

type SessionContextValue = {
  isSignedIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  requestSignIn: () => Promise<void>;
  // eslint-disable-next-line no-unused-vars
  withSession: <T>(action: () => Promise<T>) => Promise<T>;
};

type PendingSignIn = {
  promise: Promise<void>;
  resolve: () => void;
  // eslint-disable-next-line no-unused-vars
  reject: (error: Error) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Keeps track of whether the connected wallet is signed in, and shows the
 * sign-in prompt when an offchain action needs a session the user doesn't
 * have.
 *
 * Being signed in is separate from being connected. A session only counts
 * for the address it was made for, so switching accounts in the wallet means
 * signed out until the user signs in with the new one. Disconnecting ends
 * the session.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { address, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const utils = trpc.useUtils();

  const me = trpc.auth.me.useQuery(undefined, { enabled: !!address });
  const { mutateAsync: getNonce } = trpc.auth.nonce.useMutation();
  const { mutateAsync: submitSignIn } = trpc.auth.signIn.useMutation();
  const { mutateAsync: submitSignOut } = trpc.auth.signOut.useMutation();

  const isSignedIn = !!address && me.data?.address === address.toLowerCase();

  const [prompt, setPrompt] = useState<{ expired: boolean } | null>(null);
  const pendingRef = useRef<PendingSignIn | null>(null);

  /**
   * Gets a nonce, asks the wallet to sign a SIWE message for this site, and
   * sends it to the server to start a session.
   */
  const signIn = useCallback(async () => {
    if (!address) {
      throw new Error('Connect your wallet first');
    }

    const nonce = await getNonce();
    const message = createSiweMessage({
      domain: window.location.host,
      address,
      statement: SIGN_IN_STATEMENT,
      uri: window.location.origin,
      version: '1',
      chainId: chainId ?? base.id,
      nonce,
      issuedAt: new Date(),
      expirationTime: new Date(Date.now() + NONCE_TTL_MS),
    });
    const signature = await signMessageAsync({ message });
    const session = await submitSignIn({ message, signature });

    utils.auth.me.setData(undefined, session);
  }, [address, chainId, getNonce, signMessageAsync, submitSignIn, utils]);

  /**
   * Ends the session on the server and forgets it here.
   */
  const signOut = useCallback(async () => {
    utils.auth.me.setData(undefined, null);
    await submitSignOut();
  }, [submitSignOut, utils]);

  /**
   * Closes the prompt and settles whoever was waiting on it: resolved if the
   * user signed in, rejected with SignInCancelledError if they didn't.
   */
  const closePrompt = useCallback((signedIn: boolean) => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    setPrompt(null);

    if (signedIn) {
      pending?.resolve();
    } else {
      pending?.reject(new SignInCancelledError());
    }
  }, []);

  /**
   * Opens the prompt and returns a promise that settles when the user signs
   * in or closes it. Calls made while the prompt is open share one promise.
   */
  const openPrompt = useCallback(
    ({ expired }: { expired: boolean }) => {
      if (!address) {
        return Promise.reject(new Error('Connect your wallet first'));
      }

      if (!pendingRef.current) {
        let resolve!: PendingSignIn['resolve'];
        let reject!: PendingSignIn['reject'];
        const promise = new Promise<void>((res, rej) => {
          resolve = res;
          reject = rej;
        });
        pendingRef.current = { promise, resolve, reject };
      }

      setPrompt({ expired });

      return pendingRef.current.promise;
    },
    [address]
  );

  /**
   * Shows the sign-in prompt and resolves once the user signs in.
   */
  const requestSignIn = useCallback(
    () => openPrompt({ expired: false }),
    [openPrompt]
  );

  /**
   * Runs an offchain action, asking the user to sign in first if needed.
   */
  const withSession = useCallback(
    <T,>(action: () => Promise<T>) =>
      runWithSession(action, {
        isSignedIn,
        requestSignIn: openPrompt,
        onSessionExpired: () => utils.auth.me.setData(undefined, null),
      }),
    [isSignedIn, openPrompt, utils]
  );

  /**
   * Ends the session when the wallet disconnects.
   */
  const handleDisconnect = useCallback(() => {
    closePrompt(false);
    signOut().catch((error) => console.error('Sign-out failed', error));
  }, [closePrompt, signOut]);

  useAccountEffect({ onDisconnect: handleDisconnect });

  const value = useMemo(
    () => ({ isSignedIn, signIn, signOut, requestSignIn, withSession }),
    [isSignedIn, signIn, signOut, requestSignIn, withSession]
  );

  return (
    <SessionContext.Provider value={value}>
      {children}
      {prompt && (
        <SignInModal
          expired={prompt.expired}
          onSignIn={async () => {
            await signIn();
            closePrompt(true);
          }}
          onClose={() => closePrompt(false)}
        />
      )}
    </SessionContext.Provider>
  );
}

/**
 * The sign-in state for the connected wallet, plus helpers for offchain
 * actions. Wrap an action in withSession to have the user sign in first if
 * they need to.
 */
export function useSession() {
  const value = useContext(SessionContext);

  if (!value) {
    throw new Error('useSession must be used inside SessionProvider');
  }

  return value;
}
