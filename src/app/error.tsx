'use client';

import { useEffect } from 'react';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const interval = setInterval(() => {
      reset();
    }, 10000);

    return () => clearInterval(interval);
  }, [reset]);

  return (
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center px-6">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-full border-2 border-red-500">
          <span className="text-3xl font-bold text-red-500">!</span>
        </div>

        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          poidh is taking a quick breather
        </h1>

        <p className="mb-8 max-w-md text-lg text-gray-500">
          We're having trouble loading this page right now. This usually
          resolves itself pretty quickly.
        </p>

        <button
          onClick={() => reset()}
          className="rounded-lg bg-black px-6 py-3 font-semibold text-white transition-opacity hover:opacity-80"
        >
          Try again
        </button>

        <p className="mt-5 text-sm text-gray-400">
          We'll keep retrying automatically.
        </p>
      </div>
    </main>
  );
}
