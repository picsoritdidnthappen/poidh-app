'use client';

import { useEffect, useState } from 'react';
import { trpc } from '@/trpc/client';
import Link from 'next/link';

export default function AlbumList({ keyword = '' }: { keyword?: string }) {
  const [debouncedKeyword, setDebouncedKeyword] = useState(keyword);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(keyword), 300);
    return () => clearTimeout(t);
  }, [keyword]);

  const {
    data: albums,
    isLoading,
    isFetching,
  } = trpc.albums.fetch.useQuery({ contains: debouncedKeyword });

  return (
    <div className='w-full max-w-sm mx-auto pb-16'>
      {!albums && !isLoading ? (
        <div className='text-center py-20 text-white/60'>
          no albums available
        </div>
      ) : isLoading || isFetching ? (
        <div className='text-center py-20 text-white/60 animate-pulse'>
          loading…
        </div>
      ) : albums && albums.length > 0 ? (
        <div className='flex flex-col space-y-2'>
          <div className='flex justify-between items-center px-4 pb-2 text-white/40 text-xs font-mono tracking-wider border-b border-white/10'>
            <span className='font-semibold'>album</span>
            <span className='font-semibold'>bounties</span>
          </div>
          {albums
            .filter((album) => album.album)
            .map((album, idx) => (
              <Link href={`/a/${encodeURIComponent(album.album)}`} key={idx}>
                <div className='flex justify-between items-center px-4 py-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl text-white font-mono transition-transform hover:shadow-xl hover:bg-white/30 hover:cursor-pointer hover:border-poidhRed'>
                  <span className='truncate'>{album.album}</span>
                  <span className='opacity-80'>{album._count?.album}</span>
                </div>
              </Link>
            ))}
        </div>
      ) : (
        <div className='text-center py-20 text-white/60'>
          no albums match “{debouncedKeyword}”
        </div>
      )}
    </div>
  );
}
