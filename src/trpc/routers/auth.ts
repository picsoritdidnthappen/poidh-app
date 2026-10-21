import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { parseSiweMessage } from 'viem/siwe';
import { baseProcedure } from '../init';
import { bytesSchema } from '../serverTypes';
import {
  createSession,
  deleteSession,
  serializeSessionCookie,
} from '../session';
import { claimNonce, createNonce } from '../nonce';
import { isAllowedHost } from '@/utils/authConfig';
import { chains } from '@/utils/config';

export const authRouter = {
  /**
   * Returns the signed-in address for this browser, or null if signed out.
   */
  me: baseProcedure.query(async ({ ctx }) => {
    return ctx.getSession();
  }),

  /**
   * Hands out a one-time random value for the client to put in a message it
   * signs: the sign-in message, or an admin's ban message.
   */
  nonce: baseProcedure.mutation(() => createNonce()),

  /**
   * Signs the user in with a signed SIWE message and sets the session cookie.
   *
   * Checks that the request came in on an allowed host, that the message
   * names that same host and hasn't expired, and that the signature is from
   * the address in the message. Smart wallets are checked onchain, so this
   * uses the chain the message was signed on. Finally it claims the nonce so
   * the message can't be used again.
   */
  signIn: baseProcedure
    .input(
      z.object({
        message: z.string().max(2000),
        signature: bytesSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { host, resHeaders } = ctx;

      if (!host || !isAllowedHost(host) || !resHeaders) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Sign-in is not available on this site',
        });
      }

      const parsed = parseSiweMessage(input.message);

      if (!parsed.address || !parsed.nonce) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid sign-in message',
        });
      }

      const chain =
        Object.values(chains).find(({ id }) => id === parsed.chainId) ??
        chains.base;

      const isValid = await chain.provider
        .verifySiweMessage({
          message: input.message,
          signature: input.signature,
          domain: host,
        })
        .catch(() => false);

      if (!isValid) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Signature is invalid',
        });
      }

      if (!(await claimNonce(parsed.nonce))) {
        throw new TRPCError({
          code: 'UNPROCESSABLE_CONTENT',
          message: 'Sign-in request expired, please try again',
        });
      }

      const address = parsed.address.toLowerCase();
      const token = await createSession({ address, host });

      resHeaders.append('Set-Cookie', serializeSessionCookie(token));

      return { address };
    }),

  /**
   * Ends the current session and clears the cookie.
   */
  signOut: baseProcedure.mutation(async ({ ctx }) => {
    if (ctx.sessionToken) {
      await deleteSession(ctx.sessionToken);
    }

    ctx.resHeaders?.append('Set-Cookie', serializeSessionCookie(null));
  }),
};
