"use client";

import { useEffect, useState } from "react";
import type { ConditionKey } from "./conditions";

/**
 * Which conditions a visitor has told Poshan they're managing — shared
 * between the Biomarkers tab (where it's picked) and Your Meals (where it
 * gates what gets a caution/avoid flag on add). Used to live as private
 * useState inside the Conditions component alone, which is exactly why
 * adding a meal never warned about anything: nothing outside that one
 * component could see the selection. Client-only, localStorage-backed —
 * same tier as the rest of this app's unauthenticated personalisation
 * (cursor choice, palette, language), not a server-tracked medical record.
 */
const KEY = "poshan-picked-conditions";

function read(): ConditionKey[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ConditionKey[]) : [];
  } catch {
    return [];
  }
}

export function usePickedConditions() {
  const [picked, setPickedState] = useState<ConditionKey[]>([]);

  /* Read after mount, not during it: the server has no localStorage, so
     seeding from it during render would mismatch the SSR pass. Deferred to a
     microtask rather than called straight from the effect body — same
     pattern as AdviceBar's own read — so this doesn't trip the "no
     synchronous setState in an effect" lint. */
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setPickedState(read());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /* Other mounted instances of this hook (Conditions tab open in one tab
     panel, Your Meals reading it in another) pick up a change immediately
     rather than only after their own next write. */
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setPickedState(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setPicked = (next: ConditionKey[] | ((p: ConditionKey[]) => ConditionKey[])) => {
    setPickedState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      try {
        window.localStorage.setItem(KEY, JSON.stringify(value));
      } catch {
        /* Private mode: the selection still applies for this render. */
      }
      return value;
    });
  };

  return { picked, setPicked };
}
