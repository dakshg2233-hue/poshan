"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, ChevronDown } from "lucide-react";
import { useWeekPlan } from "@/lib/hooks/use-week-plan";
import type { MealTime } from "@/lib/poshan-data";

const MEAL_TIME_LABEL: Record<MealTime, string> = {
  breakfast: "B",
  lunch: "L",
  dinner: "D",
  snack: "S",
};

function dayLabel(offset: number): string {
  if (offset === 0) return "Today";
  if (offset === 1) return "Tomorrow";
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("en-IN", { weekday: "long" });
}

/**
 * The week ahead — recommendWeek() run forward from today
 * (src/lib/daily-engine.ts), so the grocery list can shop for the whole
 * week instead of just today. A suggestion to plan against, not seven
 * locked decisions: only today is loggable here, same as the Today
 * card — future days are a preview, and stay free to change once they
 * actually arrive.
 */
export function WeeklyPlan() {
  const { plan, goalSet, loading, error } = useWeekPlan();
  const [openDay, setOpenDay] = useState<number | null>(null);

  if (loading) return null;
  if (error || !plan) return null;
  if (!goalSet) return null;

  return (
    <Card className="card-in border-[var(--line)] bg-[var(--surface)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2" style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}>
          <CalendarDays className="h-5 w-5" style={{ color: "var(--kesar)" }} />
          This week ahead
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {plan.map((day) => {
            const isOpen = openDay === day.offsetDays;
            return (
              <div key={day.offsetDays} className="rounded-lg" style={{ background: "var(--roti-2, var(--roti))" }}>
                <button
                  onClick={() => setOpenDay(isOpen ? null : day.offsetDays)}
                  className="flex w-full items-center justify-between gap-2 p-3 text-left"
                >
                  <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                    {dayLabel(day.offsetDays)}
                  </span>
                  <span className="flex items-center gap-2 text-xs text-[var(--ink-soft)]">
                    {day.recommendation.picks.map((p) => (
                      <span key={p.time} title={p.name.en}>
                        {MEAL_TIME_LABEL[p.time]}: {p.name.en.length > 14 ? p.name.en.slice(0, 14) + "…" : p.name.en}
                      </span>
                    ))}
                    <ChevronDown className="h-3.5 w-3.5" style={{ transform: isOpen ? "rotate(180deg)" : undefined }} />
                  </span>
                </button>
                {isOpen && (
                  <div className="grid grid-cols-1 gap-2 px-3 pb-3 sm:grid-cols-3">
                    {day.recommendation.picks.map((p) => (
                      <div key={p.time} className="rounded-md p-2" style={{ background: "var(--surface)" }}>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">{p.time}</p>
                        <p className="text-sm" style={{ color: "var(--ink)" }}>{p.name.en}</p>
                        <p className="text-xs text-[var(--ink-soft)]">{p.kcal} kcal</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-[var(--ink-soft)]">
          Only today is logged from the Today card above — this is a plan to shop and cook against, not a fixed schedule.
        </p>
      </CardContent>
    </Card>
  );
}
