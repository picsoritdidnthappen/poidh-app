import 'server-only';

import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
import { cache } from 'react';

import { createCallerFactory } from './init';
import { makeQueryClient } from './query-client';
import { appRouter } from './trpc';
import { createContext } from './context';

// One query client per server request (cache() is scoped to the request), so
// everything loaded while rendering a page ends up in the same cache. Asking
// it for the same query twice in a request (e.g. generateMetadata and the
// page) reuses the first result instead of hitting the DB again.
export const getQueryClient = cache(makeQueryClient);

// Calls tRPC procedures directly as functions, without going over HTTP:
// `await trpcCaller.bounties.fetch({ id, chainId })` runs the same code as
// `trpc.bounties.fetch.useQuery(...)` in the browser, but in this process.
// It has no cache, so every call hits the DB.
export const trpcCaller = createCallerFactory(appRouter)(createContext);

// Builds react-query options for procedures, run in this process. Use them
// with the request's query client:
// - `getQueryClient().prefetchQuery(trpc.x.y.queryOptions(input))` loads data
//   for <HydrateClient>; the matching `trpc.x.y.useQuery(input)` in the
//   browser then starts with it.
// - `getQueryClient().fetchQuery(trpc.x.y.queryOptions(input))` also returns
//   the data (e.g. for generateMetadata).
export const trpc = createTRPCOptionsProxy({
  router: appRouter,
  ctx: createContext,
  queryClient: getQueryClient,
});

// Sends everything in the request's query client to the browser's
export function HydrateClient(props: { children: React.ReactNode }) {
  return (
    <HydrationBoundary state={dehydrate(getQueryClient())}>
      {props.children}
    </HydrationBoundary>
  );
}
