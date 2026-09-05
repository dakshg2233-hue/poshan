"use client";

import { useEffect, useState } from "react";

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalDaysLogged: number;
  earnedBadges: number[];
  nextBadge: number | null;
}

export function useStreak() {
  const [data, setData] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/daily/streak")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading };
}
