import Hero from '@/components/feed/Hero';
import { makeQueryClient } from '@/trpc/query-client';
import { HydrateClient, trpc } from '@/trpc/server';
import { HERO_FETCH_LIMIT } from '@/utils/constants';

// The hero lives in a layout because a tab or sort change only rerenders the
// page, so it doesn't load the hero again
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
      trpc.claims.fetchLatest.queryOptions({ limit: HERO_FETCH_LIMIT })
    ),
    queryClient.query(
      trpc.claims.fetchRecentPayouts.queryOptions({ limit: HERO_FETCH_LIMIT })
    ),
  ]);

  return (
    <>
      <HydrateClient queryClient={queryClient}>
        <Hero />
      </HydrateClient>
      {children}
    </>
  );
}
