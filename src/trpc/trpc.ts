import { usersRouter } from '@/trpc/routers/users';
import { createTRPCRouter } from './init';
import { accountsRouter } from './routers/accounts';
import { adminRouter } from './routers/admin';
import { albumsRouter } from './routers/albums';
import { bountiesRouter } from './routers/bounties';
import { claimsRouter } from './routers/claims';
import { commentsRouter } from './routers/comments';
import { leaderboardRouter } from './routers/leaderboard';
import { neynarRouter } from './routers/neynar';
import { web3Router } from './routers/web3';
import { zkpassportRouter } from './routers/zkpassport';

export const appRouter = createTRPCRouter({
  bounties: bountiesRouter,
  claims: claimsRouter,
  admin: adminRouter,
  albums: albumsRouter,
  comments: commentsRouter,
  neynar: neynarRouter,
  accounts: accountsRouter,
  leaderboard: leaderboardRouter,
  web3: web3Router,
  users: usersRouter,
  zkpassport: zkpassportRouter,
});

export type AppRouter = typeof appRouter;
