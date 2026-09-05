import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";
import { recommendWeek, PANTRY_STAPLES, type PantryStapleKey } from "@/lib/daily-engine";
import { estimateMaintenanceKcal, type ActivityLevel } from "@/lib/energy-requirement";
import type { GoalKey, DietKey, RegionKey } from "@/lib/poshan-data";
import type { ConditionKey } from "@/lib/conditions";

/**
 * The week-ahead plan behind the "This week" view and the weekly grocery
 * list: recommendWeek() run forward from today, each day's picks feeding
 * the next day's variety check (see daily-engine.ts). A suggestion to
 * shop and cook against, not seven locked decisions — the existing
 * per-day "log something else" swap is exactly as free on day 4 as it is
 * on day 1, this just gives day 1 a starting plan for the whole week
 * instead of only for itself.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthedSupabase(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const familyMemberId = request.nextUrl.searchParams.get("family_member_id");
  const target = familyMemberId
    ? (
        await supabase
          .from("family_members")
          .select("*")
          .eq("id", familyMemberId)
          .eq("account_id", user.id)
          .maybeSingle()
      ).data
    : (await supabase.from("profiles").select("*").eq("id", user.id).single()).data;

  if (!target) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }
  if (!target.goal) {
    return NextResponse.json({ plan: null, goalSet: false });
  }

  const [{ data: conditionRows }, { data: recentLogs }, { data: pantryRows }] = await Promise.all([
    familyMemberId
      ? Promise.resolve({ data: [] as { condition: string }[] })
      : supabase.from("user_conditions").select("condition").eq("user_id", user.id),
    (familyMemberId
      ? supabase.from("daily_meal_logs").select("dish_id, log_date").eq("user_id", user.id).eq("family_member_id", familyMemberId)
      : supabase.from("daily_meal_logs").select("dish_id, log_date").eq("user_id", user.id).is("family_member_id", null)
    ).gte("log_date", new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10)),
    supabase.from("pantry_items").select("item_key, in_stock").eq("user_id", user.id),
  ]);

  const maintenanceKcal =
    target.tdee ??
    (target.weight_kg && target.age && target.sex && target.activity_level
      ? estimateMaintenanceKcal(target.weight_kg, target.age, target.sex, target.activity_level as ActivityLevel)
      : null);

  const pantryStaples = (pantryRows ?? [])
    .filter((r) => r.in_stock)
    .map((r) => r.item_key as PantryStapleKey)
    .filter((key) => PANTRY_STAPLES.some((s) => s.key === key));

  const plan = recommendWeek(
    {
      region: (target.region as RegionKey) ?? null,
      diet: (target.diet as DietKey) ?? "veg",
      goal: target.goal as GoalKey,
      maintenanceKcal,
      conditions: (conditionRows ?? []).map((c) => c.condition as ConditionKey),
      recentDishIds: (recentLogs ?? []).map((l) => l.dish_id),
      pantryStaples,
    },
    7
  );

  return NextResponse.json({ plan, goalSet: true });
}
