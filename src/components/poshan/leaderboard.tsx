"use client";

import { useLeaderboard } from "@/lib/hooks/use-leaderboard";

/**
 * The public leaderboard — a Minecraft server-scoreboard look. Opt-in
 * only, pseudonymous (see /api/gamification/leaderboard), scored on
 * streak days alone. Shows nothing, not even an empty state, if the
 * account hasn't opted in — the settings card is where that choice
 * lives, not a nag here.
 */
export function Leaderboard() {
  const { data, loading } = useLeaderboard();

  if (loading || !data || !data.enabled || !data.entries || data.entries.length === 0) return null;

  return (
    <div className="mc-ui mc-panel-dark">
      <p className="mc-title mb-3" style={{ color: "var(--mc-gold, #fbd93b)" }}>Leaderboard</p>
      <div className="space-y-1.5">
        {data.entries.slice(0, 10).map((e, i) => (
          <div
            key={e.handle}
            className="flex items-center justify-between px-2 py-1.5"
            style={{ background: e.isSelf ? "rgba(251, 217, 59, 0.18)" : "rgba(255,255,255,0.04)" }}
          >
            <span className="mc-label" style={{ color: e.isSelf ? "var(--mc-gold, #fbd93b)" : "#e8e8e8", fontSize: "0.56rem" }}>
              #{i + 1} {e.handle}
            </span>
            <span className="mc-label" style={{ color: "#e8e8e8", fontSize: "0.56rem" }}>{e.currentStreak}d</span>
          </div>
        ))}
      </div>
      {data.selfRank && data.selfRank > 10 && (
        <p className="mc-label mt-3" style={{ fontSize: "0.52rem", color: "#9a9a9a" }}>
          YOUR RANK: #{data.selfRank}
        </p>
      )}
    </div>
  );
}
