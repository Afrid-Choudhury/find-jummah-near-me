import { useCallback, useSyncExternalStore } from "react";

/** Tailwind's `lg` breakpoint — where the homepage splits into list + map. */
export const DESKTOP_QUERY = "(min-width: 1024px)";

/**
 * Tracks a CSS media query. Use it where a breakpoint decides what *renders*,
 * not just how it looks — e.g. the desktop map pane, which phones should never
 * mount. For styling alone, Tailwind's responsive prefixes are enough.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
