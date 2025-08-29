'use client';

import { WarrningIcon } from '@/components/global/Icons';
import * as React from 'react';

export default function Error({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main>
      <section className='bg-white'>
        <div className='layout flex min-h-screen flex-col items-center justify-center text-center text-black'>
          <WarrningIcon size={100} />
          <h1 className='mt-8 text-4xl md:text-6xl'>
            Oops, something went wrong! {error.message}
          </h1>
        </div>
      </section>
    </main>
  );
}
