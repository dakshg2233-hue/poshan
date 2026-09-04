"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBasket, Check } from "lucide-react";
import { usePantry } from "@/lib/hooks/use-pantry";

/**
 * "What's in my kitchen" — a coarse in-stock checklist, not a quantity
 * tracker. Toggling a staple here feeds the Today card's recommendation
 * (a dish whose recorded ingredients match what's checked here is
 * boosted) — see dishStaples() in daily-engine.ts for how the match works
 * and its real limits (keyword-matched against each dish's note text,
 * since the meal library has no structured ingredient list).
 */
export function PantryTracker() {
  const { items, loading, error, toggle } = usePantry();

  return (
    <Card className="card-in border-[var(--line)] bg-[var(--surface)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2" style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}>
          <ShoppingBasket className="h-5 w-5" style={{ color: "var(--kesar)" }} />
          In your kitchen
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-[var(--ink-soft)]">Loading…</p>
        ) : error ? (
          <p className="text-sm text-[var(--ink-soft)]">{error}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {items.map((item) => (
              <button
                key={item.key}
                onClick={() => toggle(item.key, !item.in_stock)}
                className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium"
                style={{
                  borderColor: "var(--line)",
                  background: item.in_stock ? "var(--kesar-fill)" : "transparent",
                  color: item.in_stock ? "#fff" : "var(--ink-soft)",
                }}
              >
                {item.in_stock && <Check className="h-3.5 w-3.5" />}
                {item.label.en}
              </button>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-[var(--ink-soft)]">
          Tap what you have at home — today&apos;s recommendation favours dishes that use it.
        </p>
      </CardContent>
    </Card>
  );
}
