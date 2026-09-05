"use client";

import { useStreak } from "@/lib/hooks/use-streak";

/**
 * Household comparison — styled like a Minecraft multiplayer server
 * list: a row per player, streak shown as a pip count. No new privacy
 * boundary here (see the migration notes): the account owner already has
 * full access to every family_members row, same as weight and symptoms
 * elsewhere — this just re-presents streak data that access already
 * covers, for family members with their own gamification left on.
 */
export function HouseholdStreaks() {
  const { data, loading } = useStreak();

  if (loading || !data || !data.enabled || !data.household || data.household.length === 0) return null;

  return (
    <div className="mc-ui mc-panel">
      <p className="mc-title mb-3">Household</p>
      <div className="space-y-2">
        {data.household.map((m) => (
          <div key={m.id} className="mc-panel-dark flex items-center justify-between">
            <span className="mc-label" style={{ color: "#e8e8e8" }}>{m.name}</span>
            <span className="mc-label" style={{ color: "var(--mc-gold, #fbd93b)" }}>
              {m.currentStreak} DAY{m.currentStreak === 1 ? "" : "S"} · {m.totalDaysLogged} TOTAL
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
