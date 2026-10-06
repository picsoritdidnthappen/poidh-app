import BountyPage from './BountyPage';
import { getQueryClient, HydrateClient, trpc } from '@/trpc/server';
import { chains } from '@/utils/config';

export default async function Bounty({
  params,
  searchParams,
}: {
  params: { netname: string; id: string };
  searchParams: { showSuccessCreationModal?: string };
}) {
  const chain = chains[params.netname as keyof typeof chains];
  const id = Number(params.id);

  // Load the main bounty data on the server so it's in the first HTML
  // instead of popping in and pushing the page down
  if (chain && params.netname !== 'degen' && !Number.isNaN(id)) {
    const queryClient = getQueryClient();
    // A failed query just loads in the browser instead
    await Promise.allSettled([
      queryClient.query(
        trpc.bounties.fetch.queryOptions({ id, chainId: chain.id })
      ),
      queryClient.query(
        trpc.bounties.participations.queryOptions({
          bountyId: id,
          chainId: chain.id,
        })
      ),
      queryClient.query(
        trpc.web3.fetchPrice.queryOptions({ currency: chain.currency })
      ),
    ]);
  }

  return (
    <HydrateClient>
      <BountyPage params={params} searchParams={searchParams} />
    </HydrateClient>
  );
}
