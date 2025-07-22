import { atom, createStore } from 'jotai';

type LoadingState = {
  isLoading: boolean;
  status: string;
};

export const loadingAtom = atom<LoadingState>({
  isLoading: false,
  status: '',
});

export const pollingChainIdAtom = atom<number | null>(null);

export const setLoadingAtom = atom(
  null,
  (get, set, { isLoading, status = 'Loading...' }: Partial<LoadingState>) => {
    set(loadingAtom, { isLoading: !!isLoading, status });
  }
);

let storeSingleton: ReturnType<typeof createStore>;

export const getStore = () => {
  if (!storeSingleton) {
    storeSingleton = createStore();
  }
  return storeSingleton;
};
