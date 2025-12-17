'use client';

import { useEffect, useState } from 'react';
import { trpc } from '@/trpc/client';
import Link from 'next/link';
import Image from 'next/image';
import InfiniteScroll from 'react-infinite-scroller';

function getDisplayName(user: {
  farcaster_tag?: string | null;
  ens?: string | null;
  degen_name?: string | null;
  address?: string;
}): string {
  if (user.farcaster_tag) return user.farcaster_tag;
  if (user.ens) return user.ens;
  if (user.degen_name) return user.degen_name;
  return user.address?.slice(0, 7) ?? '';
}

export default function UserList({ keyword = '' }: { keyword?: string }) {
  const [debouncedKeyword, setDebouncedKeyword] = useState(keyword);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(keyword), 300);
    return () => clearTimeout(t);
  }, [keyword]);

  const {
    data,
    isLoading,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpc.users.fetchByKeyword.useInfiniteQuery(
    {
      search: debouncedKeyword,
      limit: 15,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    }
  );

  const users = data?.pages.flatMap((page) => page.items) ?? [];
  const hasNoResults = !isLoading && !isFetching && users.length === 0;

  return (
    <div className='w-full max-w-sm mx-auto'>
      {isLoading && !data ? (
        <div className='text-center py-20 text-white/60 animate-pulse'>
          loading…
        </div>
      ) : hasNoResults ? (
        <div className='text-center py-20 text-white/60'>
          no users match "{debouncedKeyword}"
        </div>
      ) : !data ? (
        <div className='text-center py-20 text-white/60'>
          no users available
        </div>
      ) : (
        <div className='max-h-[65vh] overflow-y-auto pr-1'>
          <InfiniteScroll
            className='flex flex-col space-y-2'
            loadMore={() => {
              if (!isFetchingNextPage) {
                fetchNextPage();
              }
            }}
            hasMore={Boolean(hasNextPage) && !isFetchingNextPage}
            loader={
              <div
                key='user-list-loader'
                className='animate-pulse text-center py-2 text-white/60'
              >
                loading…
              </div>
            }
            threshold={200}
            useWindow={false}
          >
            <div className='flex justify-between items-center px-4 py-2 text-white/40 text-xs font-mono tracking-wider border-b border-white/10'>
              <span className='font-semibold'>user</span>
              <span className='font-semibold'>bounties</span>
            </div>
            {users.map((user, idx) => (
              <Link href={`/account/${user.address}`} key={idx}>
                <div className='flex justify-between items-center px-4 py-2 h-10 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl text-white font-mono transition-transform hover:shadow-xl hover:bg-white/30 hover:border-poidhRed text-sm'>
                  <span className='inline-flex items-center min-w-0 gap-2 overflow-hidden'>
                    {user.pfp_url && (
                      <Image
                        src={user.pfp_url}
                        alt={getDisplayName(user)}
                        width={20}
                        height={20}
                        className='rounded-full flex-shrink-0 w-[20px] h-[20px] object-cover'
                      />
                    )}
                    <span className='truncate'>{getDisplayName(user)}</span>
                  </span>
                  <span className='opacity-80 flex-shrink-0 ml-2'>
                    {user.bounty_count ?? 0}
                  </span>
                </div>
              </Link>
            ))}
          </InfiniteScroll>
        </div>
      )}
    </div>
  );
}
