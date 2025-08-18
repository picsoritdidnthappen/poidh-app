'use client';

import { useAtomValue } from 'jotai';
import { loadingAtom } from '@/store/loading';
import Loading from '@/components/global/Loading';
import { Provider } from 'jotai';
import { getStore } from '@/store/loading';

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

  return (
    <>
      {children}
      <Loading open={isLoading} status={status} />
    </>
  );
}
