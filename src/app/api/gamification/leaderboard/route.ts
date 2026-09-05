import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";
import { serviceClient } from "@/lib/supabase";
import { GAMIFICATION_ENABLED } from "@/lib/dev-flags";
import { computeStreak } from "@/lib/gamification";

/**
 * The public leaderboard — opt-in only (profiles.leaderboard_opt_in),
 * shown by an auto-generated pseudonym never a real name (see
 * generateLeaderboardHandle in gamification.ts), and scored on the same
 * neutral engagement metric as everything else here: streak days, never
 * weight or biomarkers. Crosses account boundaries, so this goes through
 * the service role rather than RLS — profiles' own RLS only ever lets a
 * user read their own row, on purpose, and loosening that broadly for
 * one feature isn't worth it when a narrow, auditable route does the
 * same job.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthedSupabase(request);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  if (!GAMIFICATION_ENABLED) {
    return NextResponse.json({ enabled: false });
  }

  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "Not configured." }, { status: 503 });

  const { data: optedIn, error } = await db
    .from("profiles")
    .select("id, leaderboard_handle")
    .eq("leaderboard_opt_in", true)
    .not("leaderboard_handle", "is", null)
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!optedIn || optedIn.length === 0) {
    return NextResponse.json({ enabled: true, entries: [], selfRank: null });
  }

  const ids = optedIn.map((p) => p.id);
  const { data: logs } = await db.from("daily_meal_logs").select("user_id, log_date").in("user_id", ids).is("family_member_id", null);

  const { data: subs } = await db
    .from("subscriptions")
    .select("user_id")
    .in("user_id", ids)
    .eq("product", "home")
    .in("status", ["trialing", "active"]);
  const premiumIds = new Set((subs ?? []).map((s) => s.user_id));

  const byUser = new Map<string, string[]>();
  for (const log of logs ?? []) {
    if (!byUser.has(log.user_id)) byUser.set(log.user_id, []);
    byUser.get(log.user_id)!.push(log.log_date);
  }

  const entries = optedIn
    .map((p) => {
      const streak = computeStreak(byUser.get(p.id) ?? [], premiumIds.has(p.id));
      return { handle: p.leaderboard_handle as string, currentStreak: streak.currentStreak, totalDaysLogged: streak.totalDaysLogged, isSelf: p.id === user.id };
    })
    .filter((e) => e.totalDaysLogged > 0)
    .sort((a, b) => b.currentStreak - a.currentStreak || b.totalDaysLogged - a.totalDaysLogged)
    .slice(0, 50);

  const selfRank = entries.findIndex((e) => e.isSelf);

  return NextResponse.json({ enabled: true, entries, selfRank: selfRank >= 0 ? selfRank + 1 : null });
}
