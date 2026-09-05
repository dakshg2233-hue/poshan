"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart } from "lucide-react";
import { useBiomarkers } from "@/lib/hooks/use-biomarkers";
import { useStreak } from "@/lib/hooks/use-streak";

/**
 * Biomarker trends next to logging consistency, in one place — the
 * evidence the pitch deck's Milestone 4 ("first outcome cohort, measured
 * HbA1c movement") depends on. Not a computed correlation: with one
 * account and a handful of readings there's nothing statistically honest
 * to correlate yet. What's real and shown here is each marker's own
 * trend and how consistently the account has actually been logging over
 * the same stretch — side by side, not fused into a claim neither number
 * alone can support.
 */
export function AdherenceOutcome() {
  const { biomarkers, loading: bioLoading } = useBiomarkers();
  const { data: streak, loading: streakLoading } = useStreak();

  if (bioLoading || streakLoading) return null;
  if (biomarkers.length === 0) return null;

  const byMarker = new Map<string, typeof biomarkers>();
  for (const b of biomarkers) {
    const list = byMarker.get(b.marker) ?? [];
    list.push(b);
    byMarker.set(b.marker, list);
  }
  const trends = Array.from(byMarker.entries())
    .map(([marker, readings]) => ({
      marker,
      readings: [...readings].sort((a, b) => a.taken_on.localeCompare(b.taken_on)),
    }))
    .filter((t) => t.readings.length >= 2);

  return (
    <Card className="card-in border-[var(--line)] bg-[var(--surface)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2" style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}>
          <LineChart className="h-5 w-5" style={{ color: "var(--kesar)" }} />
          Trends
        </CardTitle>
      </CardHeader>
      <CardContent>
        {trends.length === 0 ? (
          <p className="text-sm text-[var(--ink-soft)]">
            Log the same biomarker twice to see a trend here.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {trends.map(({ marker, readings }) => (
              <MarkerSparkline key={marker} marker={marker} readings={readings} />
            ))}
          </div>
        )}

        {streak && (
          <p className="mt-4 border-t pt-3 text-xs text-[var(--ink-soft)]" style={{ borderColor: "var(--line)" }}>
            {streak.totalDaysLogged} day{streak.totalDaysLogged === 1 ? "" : "s"} of meals logged in total, current streak {streak.currentStreak}.
            The more consistently that number grows, the more this trend actually means.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function MarkerSparkline({ marker, readings }: { marker: string; readings: { value: number; unit: string; taken_on: string }[] }) {
  const values = readings.map((r) => r.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const W = 200;
  const H = 44;
  const points = readings.map((r, i) => {
    const x = readings.length > 1 ? (i / (readings.length - 1)) * W : W / 2;
    const y = H - ((r.value - min) / span) * (H - 8) - 4;
    return `${x},${y}`;
  });
  const first = readings[0];
  const last = readings[readings.length - 1];
  const delta = last.value - first.value;

  return (
    <figure>
      <figcaption className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
        {marker}
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${marker} trend from ${first.value} to ${last.value} ${last.unit}`}
        style={{ width: "100%", height: "auto", maxHeight: 50 }}
      >
        <polyline points={points.join(" ")} fill="none" stroke="var(--kesar)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={points[points.length - 1].split(",")[0]} cy={points[points.length - 1].split(",")[1]} r={3} fill="var(--kesar)" />
      </svg>
      <p className="mt-1 flex items-baseline justify-between text-xs">
        <span style={{ color: "var(--ink)" }}>{last.value} {last.unit}</span>
        <span className="text-[var(--ink-soft)]">{delta === 0 ? "No change" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}`}</span>
      </p>
    </figure>
  );
}
