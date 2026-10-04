import Navbar from '@/components/global/Navbar';
import AccountInfo from '@/components/account/AccountInfo';
import { getSectionFromParam, PAGE_SIZE } from '@/components/account/sections';
import { getQueryClient, HydrateClient, trpc } from '@/trpc/server';

export default async function Account({
  params,
  searchParams,
}: {
  params: { address: string };
  searchParams: { tab?: string };
}) {
  const address = params.address.toLocaleLowerCase();
  const section = getSectionFromParam(searchParams.tab);

  // Load the stats and the open tab's first page on the server, so they're
  // in the first HTML instead of popping in
  const queryClient = getQueryClient();
  const listInput = { address, limit: PAGE_SIZE };
  const getNextPageParam = <T,>(lastPage: { nextCursor?: T }) =>
    lastPage.nextCursor;
  const prefetchList = {
    bounties: () =>
      queryClient.infiniteQuery(
        trpc.accounts.bounties.infiniteQueryOptions(listInput, {
          getNextPageParam,
        })
      ),
    claims: () =>
      queryClient.infiniteQuery(
        trpc.accounts.claims.infiniteQueryOptions(listInput, {
          getNextPageParam,
        })
      ),
    nfts: () =>
      queryClient.infiniteQuery(
        trpc.accounts.nfts.infiniteQueryOptions(listInput, {
          getNextPageParam,
        })
      ),
  }[section];
  // A failed query just loads in the browser instead
  await Promise.allSettled([
    queryClient.query(trpc.accounts.stats.queryOptions({ address })),
    queryClient.query(trpc.accounts.activitiesCount.queryOptions({ address })),
    prefetchList(),
  ]);

  return (
    <HydrateClient>
      <AccountInfo address={address} />
      <Navbar type='bounty' />
    </HydrateClient>
  );
}
