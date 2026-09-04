"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat, Check, Clock3, IndianRupee } from "lucide-react";
import { useDaily } from "@/lib/hooks/use-daily";
import { MEAL_LIBRARY, type MealTime } from "@/lib/poshan-data";
import type { CostTier } from "@/lib/daily-engine";

const MEAL_TIME_LABEL: Record<MealTime, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

const BUDGET_LABEL: Record<CostTier, string> = {
  budget: "Budget",
  moderate: "Moderate",
  premium: "No limit",
};

/**
 * The dashboard's "what should I eat today" card — src/lib/daily-engine.ts
 * run server-side through /api/daily. Every pick here is a real
 * MEAL_LIBRARY dish safety-checked against the user's own conditions, not a
 * generic suggestion; "Log something else" always stays one tap away,
 * because the recommendation is a starting point, not an instruction.
 */
export function TodayRecommendation() {
  const { data, loading, error, logMeal, setContext } = useDaily();
  const [swapping, setSwapping] = useState<MealTime | null>(null);
  const [swapChoice, setSwapChoice] = useState<string>("");

  if (loading) {
    return (
      <Card className="card-in border-[var(--line)] bg-[var(--surface)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}>
            <ChefHat className="h-5 w-5" style={{ color: "var(--kesar)" }} />
            Today&apos;s plate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--ink-soft)]">Loading…</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="card-in border-[var(--line)] bg-[var(--surface)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}>
            <ChefHat className="h-5 w-5" style={{ color: "var(--kesar)" }} />
            Today&apos;s plate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--ink-soft)]">{error ?? "Sign in to see today's plate."}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data.goalSet) {
    return (
      <Card className="card-in border-[var(--line)] bg-[var(--surface)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2" style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}>
            <ChefHat className="h-5 w-5" style={{ color: "var(--kesar)" }} />
            Today&apos;s plate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--ink-soft)]">
            Set a goal on your <Link href="/profile" style={{ color: "var(--kesar)" }}>profile</Link> to get a daily recommendation built around it.
          </p>
        </CardContent>
      </Card>
    );
  }

  const loggedByTime = new Map(data.todayLogs.map((l) => [l.meal_time, l]));

  return (
    <Card className="card-in border-[var(--line)] bg-[var(--surface)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2" style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}>
          <ChefHat className="h-5 w-5" style={{ color: "var(--kesar)" }} />
          Today&apos;s plate
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Busy day + budget context — per-day, not a permanent setting. */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setContext({ is_busy: !data.context.is_busy })}
            className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium"
            style={{
              borderColor: "var(--line)",
              background: data.context.is_busy ? "var(--kesar-fill)" : "transparent",
              color: data.context.is_busy ? "#fff" : "var(--ink-soft)",
            }}
          >
            <Clock3 className="h-3.5 w-3.5" /> Busy today
          </button>
          {(["budget", "moderate", "premium"] as CostTier[]).map((tier) => (
            <button
              key={tier}
              onClick={() => setContext({ budget_pref: data.context.budget_pref === tier ? null : tier })}
              className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium"
              style={{
                borderColor: "var(--line)",
                background: data.context.budget_pref === tier ? "var(--kesar-fill)" : "transparent",
                color: data.context.budget_pref === tier ? "#fff" : "var(--ink-soft)",
              }}
            >
              <IndianRupee className="h-3.5 w-3.5" /> {BUDGET_LABEL[tier]}
            </button>
          ))}
        </div>

        {data.recommendation && data.recommendation.picks.length > 0 ? (
          <div className="space-y-3">
            {data.recommendation.picks.map((pick) => {
              const logged = loggedByTime.get(pick.time);
              const loggedMeal = logged ? MEAL_LIBRARY.find((m) => m.id === logged.dish_id) : null;
              const alternatives = MEAL_LIBRARY.filter((m) => m.time === pick.time);

              return (
                <div key={pick.time} className="rounded-lg p-3" style={{ background: "var(--roti-2, var(--roti))" }}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-soft)]">
                    {MEAL_TIME_LABEL[pick.time]}
                  </p>

                  {logged ? (
                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-sm" style={{ color: "var(--ink)" }}>
                        <Check className="mr-1 inline h-4 w-4" style={{ color: "var(--clinical, var(--kesar))" }} />
                        {loggedMeal?.name.en ?? logged.dish_id}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium" style={{ color: "var(--ink)" }}>{pick.name.en}</p>
                          <p className="text-xs text-[var(--ink-soft)]">
                            {pick.kcal} kcal
                            {pick.quickPrep ? " · Quick to make" : ""}
                          </p>
                        </div>
                        <button
                          onClick={() => logMeal(pick.id, pick.time, "recommended")}
                          className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold text-white"
                          style={{ background: "var(--kesar-fill)" }}
                        >
                          Log it
                        </button>
                      </div>
                      {pick.reasons.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {pick.reasons.map((r, i) => (
                            <span
                              key={i}
                              className="rounded-full px-2 py-0.5 text-[10px]"
                              style={{ background: "var(--surface)", color: "var(--ink-soft)", border: "1px solid var(--line)" }}
                            >
                              {r.en}
                            </span>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => {
                          setSwapping(swapping === pick.time ? null : pick.time);
                          setSwapChoice("");
                        }}
                        className="mt-1.5 text-xs underline"
                        style={{ color: "var(--ink-soft)" }}
                      >
                        Log something else instead
                      </button>
                      {swapping === pick.time && (
                        <div className="mt-2 flex gap-2">
                          <select
                            className="flex-1 rounded-md border px-2 py-1.5 text-xs"
                            style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}
                            value={swapChoice}
                            onChange={(e) => setSwapChoice(e.target.value)}
                          >
                            <option value="" disabled>Choose a dish…</option>
                            {alternatives.map((m) => (
                              <option key={m.id} value={m.id}>{m.name.en} ({m.kcal} kcal)</option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              if (!swapChoice) return;
                              logMeal(swapChoice, pick.time, "manual");
                              setSwapping(null);
                            }}
                            className="rounded-md px-2 py-1.5 text-xs font-semibold text-white"
                            style={{ background: "var(--kesar-fill)" }}
                          >
                            Log
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}

            <p className="text-xs text-[var(--ink-soft)]">
              Target {data.recommendation.targetKcal.toLocaleString("en-IN")} kcal · Plate totals {data.recommendation.totalKcal.toLocaleString("en-IN")} kcal
            </p>
          </div>
        ) : (
          <p className="text-sm text-[var(--ink-soft)]">
            Nothing in the library fits your diet, region and conditions for every meal today — try adjusting your profile.
          </p>
        )}

        {data.yesterdayLogs.length > 0 && (
          <p className="mt-4 border-t pt-3 text-xs text-[var(--ink-soft)]" style={{ borderColor: "var(--line)" }}>
            Yesterday: {data.yesterdayLogs.length} meal{data.yesterdayLogs.length === 1 ? "" : "s"} logged.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
