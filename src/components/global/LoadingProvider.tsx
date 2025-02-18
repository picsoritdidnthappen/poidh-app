'use client';

import { useAtomValue } from 'jotai';
import { loadingAtom } from '@/store/loading';
import Loading from '@/components/global/Loading';

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const { isLoading, status } = useAtomValue(loadingAtom);

  return (
    <>
      {children}
      <Loading open={isLoading} status={status} />
    </>
  );
}
