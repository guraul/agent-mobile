/**
 * useStore — subscribe React components to the mock store.
 * Re-renders on every mutation (actions swap top-level state reference).
 */
import { useSyncExternalStore } from 'react';
import { Store } from './actions';

export function useStore(store: Store) {
  return useSyncExternalStore(
    (cb) => store.subscribe(cb),
    () => store.state,
  );
}
