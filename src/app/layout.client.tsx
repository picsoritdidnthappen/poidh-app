'use client';

import { usePathname } from 'next/navigation';
import React from 'react';
import Header from '@/components/layout/Header';

const ClientLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname(); // Get the current path
  const shouldShowHeader = !pathname?.includes('/frames'); // Check if path includes '/frames'

  console.log('Path:', pathname, 'Show Header:', shouldShowHeader);

  return (
    <>
      {shouldShowHeader && <Header />}
      {children}
    </>
  );
};

export default ClientLayout;
