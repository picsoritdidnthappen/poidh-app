'use client';

import { useAtomValue } from 'jotai';
import { loadingAtom, getStore } from '@/store/loading';
import Loading from '@/components/global/Loading';
import { Provider } from 'jotai';

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const store = getStore();

  return (
    <Provider store={store}>
      <LoadingProviderContent>{children}</LoadingProviderContent>
    </Provider>
  );
}

function LoadingProviderContent({ children }: { children: React.ReactNode }) {
  const { isLoading, status } = useAtomValue(loadingAtom);

  return (
    <>
      {children}
      <Loading open={isLoading} status={status} />
    </>
  );
}
