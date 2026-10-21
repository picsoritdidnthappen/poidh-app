import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { Context } from './context';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const baseProcedure = t.procedure;
export const middleware = t.middleware;
export const createCallerFactory = t.createCallerFactory;

/**
 * A procedure that needs the user to be signed in, for offchain actions like
 * comments and votes. Adds the session to ctx, or throws UNAUTHORIZED if there
 * isn't one. The client treats UNAUTHORIZED as "ask the user to sign in
 * again", so procedures should use other codes for any other failure.
 */
export const authedProcedure = t.procedure.use(async ({ ctx, next }) => {
  const session = await ctx.getSession();

  if (!session) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Sign in to continue',
    });
  }

  return next({ ctx: { ...ctx, session } });
});
