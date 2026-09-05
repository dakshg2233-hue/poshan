"use client";

import { useEffect, useState } from "react";
import type { Bi } from "@/lib/poshan-data";
import type { CostTier } from "@/lib/daily-engine";

export interface WeeklyPick {
  id: string;
  name: Bi;
  time: "breakfast" | "lunch" | "dinner";
  kcal: number;
  costTier: CostTier;
  quickPrep: boolean;
  reasons: Bi[];
}

export interface WeeklyDayPlan {
  offsetDays: number;
  recommendation: { targetKcal: number; totalKcal: number; picks: WeeklyPick[] };
}

export function useWeekPlan() {
  const [plan, setPlan] = useState<WeeklyDayPlan[] | null>(null);
  const [goalSet, setGoalSet] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/daily/week-plan");
        if (response.status === 401) {
          if (!cancelled) setPlan(null);
          return;
        }
        if (!response.ok) throw new Error("Failed to load the week's plan");
        const data = await response.json();
        if (!cancelled) {
          setPlan(data.plan);
          setGoalSet(data.goalSet);
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
  }, []);

  return { plan, goalSet, loading, error };
}
