import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string, defaultValue = false): boolean {
  return useSyncExternalStore(
    (callback) => {
      if (typeof window === 'undefined') return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', callback);
      return () => mql.removeEventListener('change', callback);
    },
    () => (typeof window !== 'undefined' ? window.matchMedia(query).matches : defaultValue),
    () => defaultValue
  );
}

export function useIsDesktop(): boolean {
  // Standard 768px (md) breakpoint separating mobile from desktop/tablet
  return useMediaQuery('(min-width: 768px)', false);
}
