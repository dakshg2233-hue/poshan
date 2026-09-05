import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";

/** Ordered ascending — the highest threshold met is the badge shown. */
export const STREAK_BADGES = [3, 7, 14, 30, 60, 100] as const;

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * How many days in a row (ending today or yesterday — logging yesterday
 * and today still counts as live) the account owner has logged at least
 * one meal, plus the longest streak on record. A plain day-count over
 * daily_meal_logs.log_date, nothing more — the honest retention metric
 * this loop is actually for, same principle as /api/daily/week.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthedSupabase(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("daily_meal_logs")
    .select("log_date")
    .eq("user_id", user.id)
    .is("family_member_id", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const days = Array.from(new Set((data ?? []).map((r) => r.log_date as string))).sort();

  let longest = 0;
  let running = 0;
  let prev: Date | null = null;
  for (const day of days) {
    const d = new Date(day + "T00:00:00Z");
    if (prev && d.getTime() - prev.getTime() === 86_400_000) {
      running += 1;
    } else {
      running = 1;
    }
    longest = Math.max(longest, running);
    prev = d;
  }

  const today = toDateOnly(new Date());
  const yesterday = toDateOnly(new Date(Date.now() - 86_400_000));
  const daySet = new Set(days);

  let current = 0;
  if (daySet.has(today) || daySet.has(yesterday)) {
    const cursor = new Date((daySet.has(today) ? today : yesterday) + "T00:00:00Z");
    while (daySet.has(toDateOnly(cursor))) {
      current += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
  }

  const earnedBadges = STREAK_BADGES.filter((b) => longest >= b);

  return NextResponse.json({
    currentStreak: current,
    longestStreak: longest,
    totalDaysLogged: days.length,
    earnedBadges,
    nextBadge: STREAK_BADGES.find((b) => b > current) ?? null,
  });
}
