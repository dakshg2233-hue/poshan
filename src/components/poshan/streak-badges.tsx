"use client";

import { useEffect, useRef, useState } from "react";
import { useStreak, type BadgeInfo } from "@/lib/hooks/use-streak";

const BADGE_COLOR: Record<string, string> = {
  streak_3: "#cd7f32",
  streak_7: "#c0c0c0",
  streak_14: "#ffd700",
  streak_30: "#5a8f3c",
  streak_60: "#4ce4e8",
  streak_100: "#fbd93b",
  streak_150: "#a020f0",
  streak_200: "#ff4d4d",
  thali_complete: "#ff8c3c",
  vrat_warrior: "#8a4fbf",
  festival_feaster: "#e0507a",
  regional_explorer: "#3c8ce0",
  kitchen_ready: "#5a8f3c",
  family_table: "#3cc9a8",
  voice_of_the_kitchen: "#4ce4e8",
};

const SEEN_KEY = "poshan-badges-seen";

function readSeen(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]");
  } catch {
    return [];
  }
}

/**
 * Streak (with grace days) + badges, styled as a Minecraft inventory: a
 * slot grid for badges, a hunger-bar-style row for the streak, and the
 * classic "Achievement Get!" toast the first time a new badge appears —
 * tracked in localStorage per-browser, not server state, since it's only
 * a one-time animation cue, not something that needs to sync anywhere.
 * Computed server-side in /api/gamification/summary from
 * daily_meal_logs, daily_context and pantry_items only — never weight,
 * biomarkers or symptoms. Hides itself entirely when either
 * GAMIFICATION_ENABLED or this account's own opt-out is off.
 */
export function StreakBadges() {
  const { data, loading } = useStreak();
  const [toast, setToast] = useState<BadgeInfo | null>(null);
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current || !data?.badges) return;
    const seen = new Set(readSeen());
    const fresh = data.badges.find((b) => !seen.has(b.id));
    localStorage.setItem(SEEN_KEY, JSON.stringify(data.badges.map((b) => b.id)));
    if (!fresh) return;

    shownRef.current = true;
    /* Deferred a tick: this is a genuine reaction to freshly-arrived data
       (a new badge appeared since last seen), not something to compute
       during render, but setState synchronously inside the effect body
       is exactly what react-hooks/set-state-in-effect flags. */
    const showTimer = setTimeout(() => setToast(fresh), 0);
    const hideTimer = setTimeout(() => setToast(null), 3600);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [data]);

  if (loading || !data || !data.enabled || !data.streak) return null;
  const { streak, badges = [] } = data;

  /* A 10-pip row, filled left to right up to the current streak (capped
     at 10 — a longer streak is already spoken for by the badges below,
     this bar is about "is it alive right now", not the exact count). */
  const pips = Array.from({ length: 10 }, (_, i) => i);
  const filledCount = Math.min(10, streak.currentStreak);

  return (
    <>
      <div className="mc-ui mc-panel">
        <p className="mc-title mb-3">Streak</p>

        <div className="mc-bar-track mb-2" aria-label={`${streak.currentStreak} day streak`}>
          {pips.map((i) => (
            <div key={i} className="mc-bar-pip" data-filled={i < filledCount ? "true" : "false"} />
          ))}
        </div>
        <p className="mc-label mb-4">
          {streak.currentStreak} DAY{streak.currentStreak === 1 ? "" : "S"} · BEST {streak.longestStreak} · {streak.graceDaysAllowed} GRACE DAY{streak.graceDaysAllowed === 1 ? "" : "S"}
        </p>

        <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
          {Array.from({ length: Math.max(8, badges.length) }).map((_, i) => {
            const badge = badges[i];
            return (
              <div key={i} className="mc-slot" data-locked={!badge} title={badge ? `${badge.name.en} — ${badge.description.en}` : "Not yet earned"}>
                {badge && (
                  <div className="mc-block-icon" style={{ "--block-color": BADGE_COLOR[badge.id] ?? "#fbd93b" } as React.CSSProperties} />
                )}
              </div>
            );
          })}
        </div>
        {badges.length > 0 && (
          <p className="mc-label mt-3" style={{ fontSize: "0.52rem", lineHeight: 1.8 }}>
            {badges.map((b) => b.name.en).join(" · ")}
          </p>
        )}
      </div>

      {toast && (
        <div className="mc-ui mc-toast fixed bottom-6 right-6 z-[200]" role="status">
          <div className="mc-toast-icon mc-block-icon" style={{ "--block-color": BADGE_COLOR[toast.id] ?? "#fbd93b" } as React.CSSProperties} />
          <div>
            <p className="mc-toast-eyebrow">ACHIEVEMENT GET!</p>
            <p className="mc-toast-name">{toast.name.en}</p>
          </div>
        </div>
      )}
    </>
  );
}
