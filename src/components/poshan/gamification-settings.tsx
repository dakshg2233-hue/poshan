"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gamepad2 } from "lucide-react";
import { useProfile } from "@/lib/hooks/use-profile";
import { GAMIFICATION_ENABLED } from "@/lib/dev-flags";

/**
 * The reversibility control — deliberately in the site's normal design
 * language, not the Minecraft skin: a settings toggle should read as
 * serious and legible even when the feature it controls is playful.
 * Two independent switches: GAMIFICATION_ENABLED (dev-flags.ts) is the
 * app-wide kill switch, set by an env var and not reachable from here on
 * purpose; this card only ever controls this one account's own opt-out
 * and its public-leaderboard opt-in.
 */
export function GamificationSettings() {
  const { profile, updateProfile } = useProfile();
  const [busy, setBusy] = useState(false);

  if (!GAMIFICATION_ENABLED) return null;
  if (!profile) return null;

  async function toggle(field: "gamification_enabled" | "leaderboard_opt_in", value: boolean) {
    setBusy(true);
    try {
      await updateProfile({ [field]: value });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="card-in border-[var(--line)] bg-[var(--surface)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2" style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}>
          <Gamepad2 className="h-5 w-5" style={{ color: "var(--kesar)" }} />
          Streaks &amp; badges
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-lg p-3" style={{ background: "var(--roti-2, var(--roti))" }}>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>Streaks and badges</p>
            <p className="text-xs text-[var(--ink-soft)]">Turn off any time — nothing is deleted, it just stops showing.</p>
          </div>
          <button
            onClick={() => toggle("gamification_enabled", !profile.gamification_enabled)}
            disabled={busy}
            className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
            style={
              profile.gamification_enabled
                ? { background: "var(--kesar-fill)", color: "#fff" }
                : { color: "var(--ink-soft)", border: "1px solid var(--line)" }
            }
          >
            {profile.gamification_enabled ? "On" : "Off"}
          </button>
        </div>

        {profile.gamification_enabled && (
          <div className="flex items-center justify-between gap-3 rounded-lg p-3" style={{ background: "var(--roti-2, var(--roti))" }}>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>Public leaderboard</p>
              <p className="text-xs text-[var(--ink-soft)]">
                Opt in to appear under an auto-generated nickname — never your real name. Shows your streak only, nothing else.
              </p>
              {profile.leaderboard_handle && (
                <p className="mt-1 text-xs" style={{ color: "var(--kesar)" }}>Your nickname: {profile.leaderboard_handle}</p>
              )}
            </div>
            <button
              onClick={() => toggle("leaderboard_opt_in", !profile.leaderboard_opt_in)}
              disabled={busy}
              className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
              style={
                profile.leaderboard_opt_in
                  ? { background: "var(--kesar-fill)", color: "#fff" }
                  : { color: "var(--ink-soft)", border: "1px solid var(--line)" }
              }
            >
              {profile.leaderboard_opt_in ? "On" : "Off"}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
