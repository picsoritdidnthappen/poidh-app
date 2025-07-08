'use client';

import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import sdk from '@farcaster/frame-sdk';

const ClientLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname(); // Get the current path
  const shouldShowHeader = !pathname?.includes('/frames'); // Check if path includes '/frames'
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
};

export default ClientLayout;
