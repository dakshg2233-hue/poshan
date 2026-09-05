"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award } from "lucide-react";
import { useStreak } from "@/lib/hooks/use-streak";

/**
 * Streak milestones on top of WeeklyReview's 7-day bar — total days
 * logged (all-time) and named badges at fixed thresholds. Computed from
 * daily_meal_logs.log_date in /api/daily/streak, nothing invented: a
 * badge here means the account actually logged that many days running.
 */
export function StreakBadges() {
  const { data, loading } = useStreak();

  if (loading || !data) return null;

  return (
    <Card className="card-in border-[var(--line)] bg-[var(--surface)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2" style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}>
          <Award className="h-5 w-5" style={{ color: "var(--kesar)" }} />
          Streak
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-4">
          <div>
            <p className="text-2xl font-bold" style={{ color: "var(--ink)" }}>{data.currentStreak}</p>
            <p className="text-xs text-[var(--ink-soft)]">day streak</p>
          </div>
          <div>
            <p className="text-lg font-semibold" style={{ color: "var(--ink)" }}>{data.longestStreak}</p>
            <p className="text-xs text-[var(--ink-soft)]">best ever</p>
          </div>
          <div>
            <p className="text-lg font-semibold" style={{ color: "var(--ink)" }}>{data.totalDaysLogged}</p>
            <p className="text-xs text-[var(--ink-soft)]">days total</p>
          </div>
        </div>

        {data.earnedBadges.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {data.earnedBadges.map((b) => (
              <span
                key={b}
                className="rounded-full px-2.5 py-1 text-xs font-semibold"
                style={{ background: "var(--kesar-fill)", color: "#fff" }}
              >
                {b}-day badge
              </span>
            ))}
          </div>
        )}
        {data.nextBadge && (
          <p className="mt-2 text-xs text-[var(--ink-soft)]">
            {data.nextBadge - data.currentStreak} more day{data.nextBadge - data.currentStreak === 1 ? "" : "s"} to the {data.nextBadge}-day badge.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
