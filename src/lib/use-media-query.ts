"use client";

import { useSyncExternalStore } from "react";

/**
 * Subscribe to a media query as an external store. Preferred over reading the
 * match into state inside an effect: it avoids a cascading render, and it keeps
 * responding if the user changes the setting while the page is open.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false // server render: assume no match
  );
}

export const usePrefersReducedMotion = () =>
  useMediaQuery("(prefers-reduced-motion: reduce)");
