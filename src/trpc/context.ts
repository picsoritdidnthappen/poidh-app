import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';

export const createContext = async (_opts: FetchCreateContextFnOptions) => {
  return {};
};

export type Context = Awaited<ReturnType<typeof createContext>>;
