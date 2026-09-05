"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat, Check, Clock3, IndianRupee, Sparkles, HelpCircle, Mic } from "lucide-react";
import { useDaily } from "@/lib/hooks/use-daily";
import { MEAL_LIBRARY, type MealTime } from "@/lib/poshan-data";
import type { CostTier, DayType } from "@/lib/daily-engine";
import { RecipePanel } from "./recipe-panel";
import { VoiceLogger } from "./voice-logger";

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

const DAY_TYPE_LABEL: Record<DayType, string> = {
  normal: "Normal day",
  vrat: "Fasting (vrat)",
  festival: "Festival",
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
  const [voiceOpenFor, setVoiceOpenFor] = useState<MealTime | null>(null);
  const [festivalDraft, setFestivalDraft] = useState("");

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
        {/* Busy day + budget + day-type context — per-day, not a permanent setting. */}
        <div className="mb-2 flex flex-wrap items-center gap-2">
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

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(["normal", "vrat", "festival"] as DayType[]).map((dt) => (
            <button
              key={dt}
              onClick={() => setContext({ day_type: dt, ...(dt !== "festival" ? { festival_name: null } : {}) })}
              className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium"
              style={{
                borderColor: "var(--line)",
                background: data.context.day_type === dt ? "var(--kesar-fill)" : "transparent",
                color: data.context.day_type === dt ? "#fff" : "var(--ink-soft)",
              }}
            >
              <Sparkles className="h-3.5 w-3.5" /> {DAY_TYPE_LABEL[dt]}
            </button>
          ))}
          {data.context.day_type === "festival" && (
            <form
              className="flex gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                if (festivalDraft.trim()) setContext({ festival_name: festivalDraft.trim() });
              }}
            >
              <input
                value={festivalDraft || data.context.festival_name || ""}
                onChange={(e) => setFestivalDraft(e.target.value)}
                placeholder="Which festival?"
                className="rounded-md border px-2 py-1 text-xs"
                style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}
              />
              <button type="submit" className="rounded-md px-2 py-1 text-xs font-semibold text-white" style={{ background: "var(--kesar-fill)" }}>
                Save
              </button>
            </form>
          )}
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
                    <div className="mt-1">
                      <p className="text-sm" style={{ color: "var(--ink)" }}>
                        <Check className="mr-1 inline h-4 w-4" style={{ color: "var(--clinical, var(--kesar))" }} />
                        {loggedMeal?.name.en ?? logged.dish_id}
                      </p>
                      {loggedMeal && <RecipePanel mealId={loggedMeal.id} />}
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

                      <WhyThisPick dishName={pick.name.en} mealTime={pick.time} reasons={pick.reasons.map((r) => r.en)} />

                      <RecipePanel mealId={pick.id} />

                      <div className="mt-1.5 flex flex-wrap gap-3">
                        <button
                          onClick={() => {
                            setSwapping(swapping === pick.time ? null : pick.time);
                            setSwapChoice("");
                          }}
                          className="text-xs underline"
                          style={{ color: "var(--ink-soft)" }}
                        >
                          Log something else instead
                        </button>
                        <button
                          onClick={() => setVoiceOpenFor(voiceOpenFor === pick.time ? null : pick.time)}
                          className="flex items-center gap-1 text-xs underline"
                          style={{ color: "var(--ink-soft)" }}
                        >
                          <Mic className="h-3 w-3" /> Or say what you ate
                        </button>
                      </div>

                      {voiceOpenFor === pick.time && (
                        <VoiceLogger
                          mealTime={pick.time}
                          onMatched={(dishId) => {
                            logMeal(dishId, pick.time, "manual");
                            setVoiceOpenFor(null);
                          }}
                        />
                      )}

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

/**
 * "Why this pick" — a self-contained call to /api/chat (the same
 * Ask-Poshan endpoint the floating chat widget uses), not the widget
 * itself: ChatWidget isn't mounted on every page this card appears on,
 * and the deterministic reasons are already known, so the question this
 * answers is a genuine follow-up ("why not X instead"), not a re-explain.
 */
function WhyThisPick({ dishName, mealTime, reasons }: { dishName: string; mealTime: string; reasons: string[] }) {
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    setOpen(true);
    if (answer || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatbot: "nutrition",
          message: `Poshan recommended "${dishName}" for my ${mealTime} today. Its stated reasons were: ${reasons.join(", ") || "no specific reasons recorded"}. Explain in a couple of sentences why this is a reasonable pick, and mention one thing I could swap it for if I don't have the ingredients.`,
        }),
      });
      if (res.status === 401) {
        setError("Sign in to ask why.");
        return;
      }
      if (!res.ok || !res.body) {
        setError("Couldn't reach the explanation right now.");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setAnswer(text);
      }
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-1.5">
      <button
        onClick={() => (open ? setOpen(false) : ask())}
        className="flex items-center gap-1 text-xs underline"
        style={{ color: "var(--ink-soft)" }}
      >
        <HelpCircle className="h-3 w-3" /> {open ? "Hide" : "Why this pick?"}
      </button>
      {open && (
        <p className="mt-1.5 rounded-md p-2 text-xs leading-relaxed" style={{ background: "var(--surface)", color: "var(--ink-soft)" }}>
          {error ?? answer ?? (busy ? "Thinking…" : "")}
          {busy && !answer && !error ? "…" : ""}
        </p>
      )}
    </div>
  );
}
