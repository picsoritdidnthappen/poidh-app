import 'server-only';

import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
import { cache } from 'react';

import { makeQueryClient } from './query-client';
import { appRouter } from './trpc';
import { createContext } from './context';

// One per request, so generateMetadata and the page share results
export const getQueryClient = cache(makeQueryClient);

// Use with getQueryClient().query(trpc.x.y.queryOptions(input))
export const trpc = createTRPCOptionsProxy({
  router: appRouter,
  ctx: createContext,
  queryClient: getQueryClient,
});

export function HydrateClient(props: { children: React.ReactNode }) {
  return (
    <HydrationBoundary state={dehydrate(getQueryClient())}>
      {props.children}
    </HydrationBoundary>
  );
}
