import { useSyncExternalStore } from 'react';

// Nothing to subscribe to: the value only changes once hydration is done
const subscribe = () => () => undefined;

// True on the server and while hydrating its HTML; false for anything that
// mounts later in the browser
export function useIsHydrating() {
  return useSyncExternalStore(
    subscribe,
    () => false,
    () => true
  );
}
