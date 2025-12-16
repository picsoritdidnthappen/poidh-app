import 'server-only';

import { createHydrationHelpers } from '@trpc/react-query/rsc';
import { cache } from 'react';

import { createCallerFactory } from './init';
import { makeQueryClient } from './query-client';
import { appRouter } from './trpc';
import { createContext } from './context';

export const getQueryClient = cache(makeQueryClient);
export const trpcCaller = createCallerFactory(appRouter)(createContext);
export const { trpc, HydrateClient } = createHydrationHelpers<typeof appRouter>(
  trpcCaller,
  getQueryClient
);
