"use client";

import { useEffect, useState } from "react";

export interface StreakSummary {
  currentStreak: number;
  longestStreak: number;
  totalDaysLogged: number;
  graceDaysAllowed: number;
}

export interface BadgeInfo {
  id: string;
  name: { en: string; hi: string };
  description: { en: string; hi: string };
  premiumOnly: boolean;
}

export interface HouseholdMember {
  id: string;
  name: string;
  currentStreak: number;
  totalDaysLogged: number;
}

export interface GamificationSummary {
  enabled: boolean;
  reason?: "app_disabled" | "user_disabled";
  isPremium?: boolean;
  streak?: StreakSummary;
  badges?: BadgeInfo[];
  household?: HouseholdMember[];
  leaderboardOptIn?: boolean;
  leaderboardHandle?: string | null;
}

export function useStreak() {
  const [data, setData] = useState<GamificationSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/gamification/summary")
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
