import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/trpc/trpc';
import { createContext } from '@/trpc/context';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
    onError: ({ req, error, ...trpc }) => {
      // Referer is useful for debugging, usually it's the page that made tRPC request
      const referrer = req.headers.get('referer');

      console.error(
        `tRPC error when processing "${trpc.path}" ${trpc.type}: ${error.message}`,
        {
          trpc,
          referrer,
          error: { ...error, stack: error.stack },
        }
      );
      console.dir(
        {
          query: req.url,
          ...trpc,
          referrer,
          error: { ...error, stack: error.stack },
        },
        { depth: 10 }
      );
    },
  });
export { handler as GET, handler as POST };
