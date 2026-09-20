import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";
import { GAMIFICATION_ENABLED } from "@/lib/dev-flags";
import { computeStreak, earnedStreakBadges, earnedActivityBadges, BADGES } from "@/lib/gamification";
import { MEAL_LIBRARY } from "@/lib/poshan-data";
import { mustWithholdTracking } from "@/lib/dpdp";

const mealRegionOf = (dishId: string) => MEAL_LIBRARY.find((m) => m.id === dishId)?.region;

/**
 * The gamification summary: this account's grace-day streak, badges
 * earned, and — since family_members data is already something the
 * account owner has full access to (same as weight/symptoms elsewhere)
 * — each family member's streak too, for the household view. Scored
 * entirely from daily_meal_logs, daily_context and pantry_items: never
 * from weight, biomarkers or symptoms.
 *
 * Two independent off switches, checked here as defence in depth even
 * though the UI is the primary place this hides: GAMIFICATION_ENABLED
 * (app-wide) and this account's own profiles.gamification_enabled.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthedSupabase(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  if (!GAMIFICATION_ENABLED) {
    return NextResponse.json({ enabled: false, reason: "app_disabled" });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("gamification_enabled, leaderboard_opt_in, leaderboard_handle, date_of_birth, age")
    .eq("id", user.id)
    .single();

  if (profile && profile.gamification_enabled === false) {
    return NextResponse.json({ enabled: false, reason: "user_disabled" });
  }

  /* DPDP s.9(3) — no tracking or behavioural monitoring of a child.
     Streaks and badges are behavioural monitoring by any honest reading:
     they exist to observe repeat behaviour and shape it. This is not a
     preference, so it is checked before profiles.gamification_enabled
     rather than alongside it — a minor cannot switch it back on, and
     neither can the account holder on their behalf.

     mustWithholdTracking treats an unknown age as a minor. That will
     withhold streaks from adults whose date of birth predates the age
     gate, which is the right way round: the cost is a missing feature
     until they fill in a birthday, and the alternative cost is showing a
     child something the Act forbids. */
  if (mustWithholdTracking({ dateOfBirth: profile?.date_of_birth, age: profile?.age })) {
    return NextResponse.json({ enabled: false, reason: "minor_protection" });
  }

  const { data: subRow } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .eq("product", "home")
    .in("status", ["trialing", "active"])
    .maybeSingle();
  const isPremium = !!subRow;

  const [{ data: ownLogs }, { data: contextRows }, { data: pantryRows }, { data: familyMembers }] = await Promise.all([
    supabase
      .from("daily_meal_logs")
      .select("log_date, meal_time, dish_id, source")
      .eq("user_id", user.id)
      .is("family_member_id", null),
    supabase.from("daily_context").select("day_type").eq("user_id", user.id),
    supabase.from("pantry_items").select("item_key").eq("user_id", user.id).eq("in_stock", true),
    supabase
      .from("family_members")
      .select("id, full_name, gamification_enabled, age")
      .eq("account_id", user.id),
  ]);

  const logs = ownLogs ?? [];
  const streak = computeStreak(
    logs.map((l) => l.log_date),
    isPremium
  );

  const vratDaysUsed = (contextRows ?? []).filter((c) => c.day_type === "vrat").length;
  const festivalDaysUsed = (contextRows ?? []).filter((c) => c.day_type === "festival").length;

  /* The household streaks are the same behavioural monitoring as the
     account holder's own, applied to people who never consented to
     anything — and family_members.age starts at 0. s.9(3) reaches them
     too, so a child in the household is excluded from streak scoring
     entirely rather than merely hidden in the UI: the number should not
     be computed, not just not shown. */
  const activeFamilyMembers = (familyMembers ?? []).filter(
    (m) => m.gamification_enabled !== false && !mustWithholdTracking({ age: m.age })
  );
  const familyLogCounts = await Promise.all(
    activeFamilyMembers.map((m) =>
      supabase.from("daily_meal_logs").select("log_date").eq("user_id", user.id).eq("family_member_id", m.id)
    )
  );
  const familyMembersLogging = familyLogCounts.filter((r) => (r.data?.length ?? 0) > 0).length;

  const badgeIds = [
    ...earnedStreakBadges(streak.longestStreak, isPremium),
    ...earnedActivityBadges(
      {
        logs,
        vratDaysUsed,
        festivalDaysUsed,
        pantryInStockCount: pantryRows?.length ?? 0,
        familyMembersLogging,
      },
      mealRegionOf
    ),
  ];
  const badges = BADGES.filter((b) => badgeIds.includes(b.id));

  const household = activeFamilyMembers.map((m, i) => {
    const memberDays = (familyLogCounts[i].data ?? []).map((r) => r.log_date);
    const memberStreak = computeStreak(memberDays, isPremium);
    return { id: m.id, name: m.full_name, currentStreak: memberStreak.currentStreak, totalDaysLogged: memberStreak.totalDaysLogged };
  });

  return NextResponse.json({
    enabled: true,
    isPremium,
    streak,
    badges,
    household,
    leaderboardOptIn: profile?.leaderboard_opt_in ?? false,
    leaderboardHandle: profile?.leaderboard_handle ?? null,
  });
}
