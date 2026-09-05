"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";
import { useDaily } from "@/lib/hooks/use-daily";
import { usePantry } from "@/lib/hooks/use-pantry";
import { MEAL_LIBRARY } from "@/lib/poshan-data";
import { dishStaples } from "@/lib/daily-engine";

/**
 * What today's plate needs that isn't already checked off in the pantry
 * tracker — turns two existing features (the daily recommendation, the
 * pantry checklist) into a third with no new backend: everything here is
 * computed client-side from data both hooks already fetch.
 *
 * Scoped to today's picks, not a full week: recommendations aren't stored
 * ahead of time (recommendToday() runs fresh per request), so "the week's
 * meals" isn't a real list to diff against yet.
 */
export function GroceryList() {
  const { data: daily, loading: dailyLoading } = useDaily();
  const { items: pantry, loading: pantryLoading } = usePantry();

  if (dailyLoading || pantryLoading) return null;
  if (!daily?.recommendation || daily.recommendation.picks.length === 0) return null;

  const inStock = new Set(pantry.filter((p) => p.in_stock).map((p) => p.key));
  const needed = new Map<string, string>(); // key -> label
  for (const pick of daily.recommendation.picks) {
    const meal = MEAL_LIBRARY.find((m) => m.id === pick.id);
    if (!meal) continue;
    for (const staple of dishStaples(meal)) {
      if (!inStock.has(staple)) {
        const pantryItem = pantry.find((p) => p.key === staple);
        if (pantryItem) needed.set(staple, pantryItem.label.en);
      }
    }
  }

  if (needed.size === 0) return null;

  return (
    <Card className="card-in border-[var(--line)] bg-[var(--surface)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2" style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}>
          <ShoppingCart className="h-5 w-5" style={{ color: "var(--kesar)" }} />
          Pick up today
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
          For today&apos;s recommended plate, not already checked off in your kitchen below.
        </p>
      </CardContent>
    </Card>
  );
}
