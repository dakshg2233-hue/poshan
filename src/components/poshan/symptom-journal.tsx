"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HeartPulse } from "lucide-react";
import { useSymptoms } from "@/lib/hooks/use-symptoms";
import { useConditions } from "@/lib/hooks/use-conditions";

const FACE = ["😞", "🙁", "😐", "🙂", "😄"];

/**
 * A daily symptom journal — energy, mood, bloating, cramps, cycle day.
 * Not gated to PCOS accounts (anyone can log), but only rendered
 * prominently when 'pcos' is one of the account's recorded conditions —
 * this is signal biomarkers alone don't carry, and the deck names PCOS as
 * the second market wedge specifically because adherence tooling for it
 * barely exists anywhere.
 */
export function SymptomJournal() {
  const { conditions, loading: condLoading } = useConditions();
  const { logs, loading, error, logSymptom } = useSymptoms();
  const [energy, setEnergy] = useState<number | null>(null);
  const [mood, setMood] = useState<number | null>(null);
  const [bloating, setBloating] = useState(false);
  const [cramps, setCramps] = useState(false);
  const [cycleDay, setCycleDay] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const hasPcos = conditions.some((c) => c.condition === "pcos");
  if (condLoading || loading) return null;
  if (!hasPcos && logs.length === 0) return null; // hide for accounts with no reason to see it yet

  async function submit() {
    setSubmitting(true);
    setFormError(null);
    try {
      await logSymptom({
        energy,
        mood,
        bloating,
        cramps,
        cycle_day: cycleDay ? Number(cycleDay) : null,
      });
      setBloating(false);
      setCramps(false);
      setCycleDay("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not log symptoms.");
    } finally {
      setSubmitting(false);
    }
  }

  const today = logs[0]?.log_date === new Date().toISOString().slice(0, 10) ? logs[0] : null;

  return (
    <Card className="card-in border-[var(--line)] bg-[var(--surface)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2" style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}>
          <HeartPulse className="h-5 w-5" style={{ color: "var(--kesar)" }} />
          How are you feeling today?
        </CardTitle>
      </CardHeader>
      <CardContent>
        {today ? (
          <p className="text-sm text-[var(--ink-soft)]">Logged for today already — come back tomorrow.</p>
        ) : (
          <>
            <div className="mb-3">
              <p className="mb-1 text-xs text-[var(--ink-soft)]">Energy</p>
              <div className="flex gap-1.5">
                {FACE.map((f, i) => (
                  <button
                    key={i}
                    onClick={() => setEnergy(i + 1)}
                    className="rounded-full px-2.5 py-1.5 text-lg"
                    style={{ background: energy === i + 1 ? "var(--kesar-fill)" : "var(--roti-2, var(--roti))" }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-3">
              <p className="mb-1 text-xs text-[var(--ink-soft)]">Mood</p>
              <div className="flex gap-1.5">
                {FACE.map((f, i) => (
                  <button
                    key={i}
                    onClick={() => setMood(i + 1)}
                    className="rounded-full px-2.5 py-1.5 text-lg"
                    style={{ background: mood === i + 1 ? "var(--kesar-fill)" : "var(--roti-2, var(--roti))" }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                onClick={() => setBloating((b) => !b)}
                className="rounded-full border px-3 py-1.5 text-xs font-medium"
                style={{
                  borderColor: "var(--line)",
                  background: bloating ? "var(--kesar-fill)" : "transparent",
                  color: bloating ? "#fff" : "var(--ink-soft)",
                }}
              >
                Bloating
              </button>
              <button
                onClick={() => setCramps((c) => !c)}
                className="rounded-full border px-3 py-1.5 text-xs font-medium"
                style={{
                  borderColor: "var(--line)",
                  background: cramps ? "var(--kesar-fill)" : "transparent",
                  color: cramps ? "#fff" : "var(--ink-soft)",
                }}
              >
                Cramps
              </button>
              <input
                type="number"
                min={1}
                max={60}
                value={cycleDay}
                onChange={(e) => setCycleDay(e.target.value)}
                placeholder="Cycle day"
                className="w-24 rounded-full border px-3 py-1.5 text-xs"
                style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}
              />
            </div>
            <button
              onClick={submit}
              disabled={submitting}
              className="rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ background: "var(--kesar-fill)" }}
            >
              {submitting ? "Logging…" : "Log today"}
            </button>
            {formError && <p className="mt-2 text-xs text-red-600">{formError}</p>}
          </>
        )}
        {error && <p className="mt-2 text-xs text-[var(--ink-soft)]">{error}</p>}
        {logs.length > 0 && (
          <p className="mt-3 border-t pt-3 text-xs text-[var(--ink-soft)]" style={{ borderColor: "var(--line)" }}>
            {logs.length} day{logs.length === 1 ? "" : "s"} logged.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
