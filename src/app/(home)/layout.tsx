import HomeHeading from '@/components/feed/HomeHeading';
import LatestClaimImages from '@/components/feed/LatestClaimImages';
import RecentPayouts from '@/components/feed/RecentPayouts';
import { makeQueryClient } from '@/trpc/query-client';
import { HydrateClient, trpc } from '@/trpc/server';
import { LATEST_CLAIMS_LIMIT, RECENT_PAYOUTS_LIMIT } from '@/utils/constants';

// The heading and rails live in a layout because a tab or sort change only
// rerenders the page, so it doesn't load them again
export default async function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Its own client, so the page's queries aren't sent twice: once here and
  // once in the page's HydrateClient
  const queryClient = makeQueryClient();
  // A failed query just loads in the browser instead
  await Promise.allSettled([
    queryClient.query(
      trpc.claims.fetchLatest.queryOptions({ limit: LATEST_CLAIMS_LIMIT })
    ),
    queryClient.query(
      trpc.claims.fetchRecentPayouts.queryOptions({
        limit: RECENT_PAYOUTS_LIMIT,
      })
    ),
  ]);

  return (
    <>
      <HomeHeading />
      <HydrateClient queryClient={queryClient}>
        <LatestClaimImages />
        <RecentPayouts />
      </HydrateClient>
      {children}
    </>
  );
}
