"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { useWeightLog } from "@/lib/hooks/use-weight-log";

/**
 * Weight over time — profiles.weight_kg only ever held the current figure,
 * so this is the first place "progress" means a trend rather than a
 * single number. Feeds the daily-engine's future progress-aware picks and
 * (eventually) the clinician's own weight-trend view for the same patient.
 */
export function WeightTracker() {
  const { logs, loading, error, logWeight } = useWeightLog();
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleLog(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const kg = Number(value);
    if (!Number.isFinite(kg) || kg < 20 || kg > 400) {
      setFormError("Enter a weight between 20 and 400 kg.");
      return;
    }
    setSubmitting(true);
    try {
      await logWeight(kg);
      setValue("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not log weight.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="card-in border-[var(--line)] bg-[var(--surface)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2" style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}>
          <TrendingUp className="h-5 w-5" style={{ color: "var(--kesar)" }} />
          Weight
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-[var(--ink-soft)]">Loading…</p>
        ) : logs.length > 0 ? (
          <WeightSparkline logs={logs} />
        ) : (
          <p className="mb-3 text-sm text-[var(--ink-soft)]">Log today&apos;s weight to start a trend.</p>
        )}

        <form onSubmit={handleLog} className="mt-3 flex gap-2">
          <input
            type="number"
            step="0.1"
            placeholder="Weight (kg)"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="flex-1 rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--kesar-fill)" }}
          >
            {submitting ? "Logging…" : "Log"}
          </button>
        </form>
        {formError && <p className="mt-2 text-xs text-red-600">{formError}</p>}
        {error && <p className="mt-2 text-xs text-[var(--ink-soft)]">{error}</p>}
      </CardContent>
    </Card>
  );
}

function WeightSparkline({ logs }: { logs: { weight_kg: number; logged_on: string }[] }) {
  const recent = logs.slice(-30);
  const values = recent.map((l) => l.weight_kg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const W = 280;
  const H = 60;
  const points = recent.map((l, i) => {
    const x = recent.length > 1 ? (i / (recent.length - 1)) * W : W / 2;
    const y = H - ((l.weight_kg - min) / span) * (H - 10) - 5;
    return `${x},${y}`;
  });
  const first = recent[0].weight_kg;
  const last = recent[recent.length - 1].weight_kg;
  const delta = last - first;

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Weight trend over the last ${recent.length} logged days, from ${first} to ${last} kilograms`}
        style={{ width: "100%", height: "auto", maxHeight: 70 }}
      >
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke="var(--kesar)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle
          cx={points[points.length - 1].split(",")[0]}
          cy={points[points.length - 1].split(",")[1]}
          r={3}
          fill="var(--kesar)"
        />
      </svg>
      <figcaption className="mt-1 flex items-baseline justify-between text-sm">
        <span style={{ color: "var(--ink)" }}>
          {last} kg
        </span>
        <span className="text-xs text-[var(--ink-soft)]">
          {delta === 0 ? "No change" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg`} over last {recent.length} log{recent.length === 1 ? "" : "s"}
        </span>
      </figcaption>
    </figure>
  );
}
