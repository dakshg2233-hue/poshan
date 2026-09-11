"use client";

import { useEffect, useState } from "react";
import type { Bi } from "@/lib/poshan-data";
import type { CostTier, DayType } from "@/lib/daily-engine";
import { track } from "@/lib/analytics";

export interface DailyPick {
  id: string;
  name: Bi;
  time: "breakfast" | "lunch" | "dinner";
  kcal: number;
  costTier: CostTier;
  quickPrep: boolean;
  reasons: Bi[];
}

export interface DailyLog {
  dish_id: string;
  meal_time: string;
  log_date: string;
  source: string;
}

export interface DailyContext {
  is_busy: boolean;
  budget_pref: CostTier | null;
  day_type: DayType;
  festival_name: string | null;
}

export interface DailyData {
  recommendation: { targetKcal: number; totalKcal: number; picks: DailyPick[] } | null;
  todayLogs: DailyLog[];
  yesterdayLogs: DailyLog[];
  context: DailyContext;
  goalSet: boolean;
}

/**
 * Same fetch-on-mount shape as useFamilyMembers: the route recomputes the
 * recommendation server-side every time, so there's nothing to subscribe
 * to — a realtime channel would just mean "refetch", which `reload` already
 * does directly after every mutation below.
 */
export function useDaily(familyMemberId?: string | null) {
  const [data, setData] = useState<DailyData | null>(null);
  const [loading, setLoading] = useState(true);
  /* A 401 here used to collapse into `data: null`, which is the same state
     as "signed in, no plan yet" — so a screen built on this hook could not
     tell a visitor to sign in without guessing. Surfaced explicitly now;
     see use-timeline.ts for the same change on the newer hooks. */
  const [signedOut, setSignedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const url = familyMemberId ? `/api/daily?family_member_id=${encodeURIComponent(familyMemberId)}` : "/api/daily";

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(url);
      if (response.status === 401) {
        setData(null);
        setSignedOut(true);
        return;
      }
      if (!response.ok) throw new Error("Failed to load today's plan");
      setSignedOut(false);
      setData(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    /* Guarded the same way useFamilyMembers' mount fetch is: state only
       commits if the effect hasn't since been cleaned up. */
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(url);
        if (response.status === 401) {
          if (!cancelled) {
            setData(null);
            setSignedOut(true);
          }
          return;
        }
        if (!response.ok) throw new Error("Failed to load today's plan");
        const result = await response.json();
        if (!cancelled) {
          setSignedOut(false);
          setData(result);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  const logMeal = async (dish_id: string, meal_time: string, source: "manual" | "recommended" | "scan" | "voice" = "manual") => {
    const response = await fetch("/api/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dish_id, meal_time, family_member_id: familyMemberId ?? undefined, source }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Failed to log meal");
    /* `source` and `meal_time` only — never the dish. What someone ate is
       exactly the kind of behaviour rule 2 in analytics.ts keeps out of a
       third-party tool. */
    track("meal_logged", { source, meal_time });
    await load();
    return result;
  };

  const setContext = async (updates: Partial<DailyContext>) => {
    const response = await fetch("/api/daily", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Failed to update today's context");
    track("day_context_set", {
      day_type: updates.day_type ?? null,
      is_busy: updates.is_busy ?? null,
      budget_pref: updates.budget_pref ?? null,
    });
    await load();
    return result;
  };

  return { data, loading, signedOut, error, logMeal, setContext, reload: load };
}
