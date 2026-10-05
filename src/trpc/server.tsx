import 'server-only';

import {
  dehydrate,
  HydrationBoundary,
  type QueryClient,
} from '@tanstack/react-query';
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

// Pass queryClient to send only that client's queries instead of the shared one
export function HydrateClient(props: {
  children: React.ReactNode;
  queryClient?: QueryClient;
}) {
  return (
    <HydrationBoundary state={dehydrate(props.queryClient ?? getQueryClient())}>
      {props.children}
    </HydrationBoundary>
  );
}
