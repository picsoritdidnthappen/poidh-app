'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAtomValue, Provider } from 'jotai';
import { loadingAtom, getStore } from '@/store/loading';
import Loading from '@/components/global/Loading';

export function LoadingLayout({ children }: { children: React.ReactNode }) {
  const store = getStore();

  return (
    <Provider store={store}>
      <LoadingLayoutContent>{children}</LoadingLayoutContent>
    </Provider>
  );
}

function LoadingLayoutContent({ children }: { children: React.ReactNode }) {
  const { isLoading, status } = useAtomValue(loadingAtom);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      {children}

      {mounted &&
        createPortal(
          <Loading open={isLoading} status={status} />,
          document.body
        )}
    </>
  );
}
