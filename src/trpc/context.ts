import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { cookies, headers } from 'next/headers';
import { findSession, type Session } from './session';
import { SESSION_COOKIE_NAME } from '@/utils/authConfig';

/**
 * Context for every tRPC call: the request's host, its session token, and a
 * way to look up the session. resHeaders is only set for calls through the
 * API route, since server components can't set cookies.
 */
export const createContext = async (opts?: FetchCreateContextFnOptions) => {
  const host = headers().get('x-forwarded-host') ?? headers().get('host');
  const sessionToken = cookies().get(SESSION_COOKIE_NAME)?.value || null;

  let session: Promise<Session | null> | undefined;

  return {
    host,
    sessionToken,
    resHeaders: opts?.resHeaders ?? null,
    getSession: () => {
      if (!sessionToken || !host) {
        return Promise.resolve(null);
      }

      if (!session) {
        session = findSession({ token: sessionToken, host });
      }

      return session;
    },
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
