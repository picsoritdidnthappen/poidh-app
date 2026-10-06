'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ALBUMS } from '@/utils/constants';

// "social bounties for <album>", turning over to the next album every 4s
export default function HomeHeading() {
  const [currentAlbumIndex, setCurrentAlbumIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAlbumIndex((prevIndex) => (prevIndex + 1) % ALBUMS.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className='flex flex-col items-center text-center px-6 pt-6 pb-2 lg:pt-14'>
      <h3 className='font-mono text-2xl mt-4 racking-wide'>
        <span className='flex flex-wrap md:flex-nowrap items-baseline justify-center gap-x-2.5'>
          <span>social bounties for</span>
          <Link
            href={`/a/${ALBUMS[currentAlbumIndex].slug}`}
            className='inline-block no-underline overflow-hidden h-[1.2em] relative w-full md:w-auto text-center md:text-left'
            style={{
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            <span
              key={currentAlbumIndex}
              className='block'
              style={{
                animation: 'turnstile 0.6s ease-in-out',
              }}
            >
              {ALBUMS[currentAlbumIndex].name}
            </span>
          </Link>
        </span>
      </h3>
    </div>
  );
}
