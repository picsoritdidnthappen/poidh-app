'use client';

import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import sdk from '@farcaster/frame-sdk';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const shouldShowHeader = !pathname?.includes('/frames');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      await sdk.actions.ready();
      setIsLoaded(true);
    };
    if (sdk && !isLoaded) {
      load();
    }
  }, [isLoaded]);

  return (
    <>
      {shouldShowHeader && <Header />}
      {children}
    </>
  );
}
