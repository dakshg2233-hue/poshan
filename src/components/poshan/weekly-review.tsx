"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck } from "lucide-react";

interface WeekSummary {
  daysLogged: number;
  totalMeals: number;
  windowDays: number;
}

/**
 * The weekly close of the daily loop: a plain "how many of the last 7 days
 * did you show up" count, not a nutrition score — see the route's own
 * comment (src/app/api/daily/week/route.ts) for why that's deliberate.
 */
export function WeeklyReview() {
  const [summary, setSummary] = useState<WeekSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/daily/week")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !summary) return null;

  return (
    <Card className="card-in border-[var(--line)] bg-[var(--surface)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2" style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}>
          <CalendarCheck className="h-5 w-5" style={{ color: "var(--kesar)" }} />
          This week
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: summary.windowDays }).map((_, i) => (
            <span
              key={i}
              className="h-2.5 flex-1 rounded-full"
              style={{ background: i < summary.daysLogged ? "var(--kesar-fill)" : "var(--line)" }}
            />
          ))}
        </div>
        <p className="mt-2 text-sm" style={{ color: "var(--ink)" }}>
          {summary.daysLogged} of {summary.windowDays} days logged
        </p>
        <p className="text-xs text-[var(--ink-soft)]">{summary.totalMeals} meals tracked this week</p>
      </CardContent>
    </Card>
  );
}
