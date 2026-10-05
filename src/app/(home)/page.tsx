import HomePage from './HomePage';
import {
  getDisplayFromParam,
  getSortFromParam,
  HOME_PAGE_SIZE,
} from './homeParams';
import { getQueryClient, HydrateClient, trpc } from '@/trpc/server';

export default async function Home({
  searchParams,
}: {
  searchParams: { tab?: string; sort?: string };
}) {
  const display = getDisplayFromParam(searchParams.tab);
  const sortType = getSortFromParam(searchParams.sort);

  // Load the selected tab's first page on the server, so it's in the first
  // HTML instead of popping in. The hero loads in the layout. A failed query
  // just loads in the browser instead.
  await getQueryClient()
    .infiniteQuery(
      trpc.bounties.fetchAll.infiniteQueryOptions(
        { status: display, limit: HOME_PAGE_SIZE, sortType },
        { getNextPageParam: (lastPage) => lastPage.nextCursor }
      )
    )
    .catch(() => null);

  return (
    <HydrateClient>
      <HomePage />
    </HydrateClient>
  );
}
