"use client";

import { useEffect, useState } from "react";

export interface LeaderboardEntry {
  handle: string;
  currentStreak: number;
  totalDaysLogged: number;
  isSelf: boolean;
}

export interface LeaderboardData {
  enabled: boolean;
  entries?: LeaderboardEntry[];
  selfRank?: number | null;
}

export function useLeaderboard() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/gamification/leaderboard")
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
