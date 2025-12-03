import type { CreateNextContextOptions } from '@trpc/server/adapters/next';

export const createContext = async (opts: CreateNextContextOptions) => {
  return {};
};

export type Context = Awaited<ReturnType<typeof createContext>>;
