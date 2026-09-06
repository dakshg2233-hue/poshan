"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";
import { useWeekPlan } from "@/lib/hooks/use-week-plan";
import { usePantry } from "@/lib/hooks/use-pantry";
import { MEAL_LIBRARY } from "@/lib/poshan-data";
import { dishStaples } from "@/lib/daily-engine";

/**
 * What the week's plan needs that isn't already checked off in the
 * pantry tracker — three existing features (the week-ahead plan, the
 * pantry checklist, dishStaples' note-text matching) combined with no
 * new backend of its own: everything here is computed client-side from
 * data useWeekPlan() and usePantry() already fetch.
 */
export function GroceryList() {
  const { plan, loading: planLoading } = useWeekPlan();
  const { items: pantry, loading: pantryLoading } = usePantry();

  if (planLoading || pantryLoading) return null;
  if (!plan || plan.length === 0) return null;

  const inStock = new Set(pantry.filter((p) => p.in_stock).map((p) => p.key));
  const needed = new Map<string, string>(); // key -> label
  for (const day of plan) {
    for (const pick of day.recommendation.picks) {
      const meal = MEAL_LIBRARY.find((m) => m.id === pick.id);
      if (!meal) continue;
      for (const staple of dishStaples(meal)) {
        if (!inStock.has(staple)) {
          const pantryItem = pantry.find((p) => p.key === staple);
          if (pantryItem) needed.set(staple, pantryItem.label.en);
        }
      }
    }
  }

  if (needed.size === 0) return null;

  return (
    <Card className="card-in border-[var(--line)] bg-[var(--surface)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2" style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}>
          <ShoppingCart className="h-5 w-5" style={{ color: "var(--kesar)" }} />
          Pick up this week
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-wrap gap-2">
          {Array.from(needed.entries()).map(([key, label]) => (
            <li
              key={key}
              className="rounded-full px-3 py-1.5 text-xs font-medium"
              style={{ background: "var(--roti-2, var(--roti))", color: "var(--ink)" }}
            >
              {label}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-[var(--ink-soft)]">
          For the week&apos;s planned dishes, not already checked off in your kitchen below.
        </p>
      </CardContent>
    </Card>
  );
}
