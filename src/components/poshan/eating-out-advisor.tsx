"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Utensils } from "lucide-react";
import { useConditions } from "@/lib/hooks/use-conditions";
import { eatingOutAdvice, type ConditionKey } from "@/lib/conditions";

/**
 * "I'm eating out, what do I order" — the one real gap in an engine that
 * otherwise assumes a home kitchen: MEAL_LIBRARY has no restaurant menu to
 * rank, so this doesn't try to recommend a specific dish. Instead it
 * reuses each of the account's own conditions' already-written favour/
 * limit lists (the same copy shown on the condition detail screen) —
 * general ordering guidance, not restaurant-specific, and honest about
 * that rather than pretending to know a menu it's never seen.
 */
export function EatingOutAdvisor() {
  const { conditions, loading } = useConditions();
  const [open, setOpen] = useState(false);

  if (loading) return null;

  const keys = conditions.map((c) => c.condition as ConditionKey);
  const advice = eatingOutAdvice(keys);
  const hasAdvice = advice.favour.length > 0 || advice.limit.length > 0;

  return (
    <Card className="card-in border-[var(--line)] bg-[var(--surface)]">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2" style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}>
          <Utensils className="h-5 w-5" style={{ color: "var(--kesar)" }} />
          Eating out today?
        </CardTitle>
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-xs font-medium underline"
          style={{ color: "var(--kesar)" }}
        >
          {open ? "Hide" : "Get advice"}
        </button>
      </CardHeader>
      {open && (
        <CardContent>
          {hasAdvice ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Lean toward</p>
                <ul className="space-y-1">
                  {advice.favour.slice(0, 6).map((f, i) => (
                    <li key={i} className="text-sm" style={{ color: "var(--ink)" }}>{f.en}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">Ask for less of / skip</p>
                <ul className="space-y-1">
                  {advice.limit.slice(0, 6).map((l, i) => (
                    <li key={i} className="text-sm" style={{ color: "var(--ink)" }}>{l.en}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--ink-soft)]">
              Choose grilled or tandoori over fried, ask for less oil, and pick dal or sabzi over a rich gravy.
              Add your conditions on the Health tab for advice tailored to them specifically.
            </p>
          )}
          <p className="mt-3 text-xs text-[var(--ink-soft)]">
            General guidance, not a menu review — Poshan doesn&apos;t know this specific restaurant&apos;s dishes.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
