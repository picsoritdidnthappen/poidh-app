'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import sdk from '@farcaster/frame-sdk';
import { sdk as miniAppSdk } from '@farcaster/miniapp-sdk';

const REJECT_KEY = 'miniapp:add:rejected';

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

      const isMiniApp = await miniAppSdk.isInMiniApp();
      if (localStorage.getItem(REJECT_KEY) === '1' || !isMiniApp) return;

      try {
        await miniAppSdk.actions.addMiniApp();
      } catch (err: any) {
        if (err?.name === 'AddMiniApp.RejectedByUser') {
          localStorage.setItem(REJECT_KEY, '1');
        }
      }
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
