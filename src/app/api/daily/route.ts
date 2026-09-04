import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";
import { recommendToday, PANTRY_STAPLES, type PantryStapleKey, type CostTier } from "@/lib/daily-engine";
import { estimateMaintenanceKcal, type ActivityLevel } from "@/lib/energy-requirement";
import type { GoalKey, DietKey, RegionKey } from "@/lib/poshan-data";
import type { ConditionKey } from "@/lib/conditions";

/**
 * The Today card's data: a fresh recommendation (recomputed every request —
 * cheap, since MEAL_LIBRARY is in-memory data, and it means pantry/context
 * changes show up immediately with no cache to invalidate), yesterday's
 * logged meals, and today's busy/budget context.
 *
 * `?family_member_id=` switches the whole thing to a family member's own
 * profile instead of the account owner's — same "who is this for" pattern
 * PatientCare and the clinician platform already use elsewhere.
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

  const [{ data: conditionRows }, { data: recentLogs }, { data: pantryRows }, { data: contextRow }] =
    await Promise.all([
      familyMemberId
        ? Promise.resolve({ data: [] as { condition: string }[] })
        : supabase.from("user_conditions").select("condition").eq("user_id", user.id),
      (familyMemberId
        ? supabase
            .from("daily_meal_logs")
            .select("dish_id, meal_time, log_date, source")
            .eq("user_id", user.id)
            .eq("family_member_id", familyMemberId)
        : supabase
            .from("daily_meal_logs")
            .select("dish_id, meal_time, log_date, source")
            .eq("user_id", user.id)
            .is("family_member_id", null)
      )
        .gte("log_date", new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10))
        .order("log_date", { ascending: false }),
      supabase.from("pantry_items").select("item_key, in_stock").eq("user_id", user.id),
      supabase
        .from("daily_context")
        .select("*")
        .eq("user_id", user.id)
        .eq("context_date", new Date().toISOString().slice(0, 10))
        .maybeSingle(),
    ]);

  const today = new Date().toISOString().slice(0, 10);
  const todayLogs = (recentLogs ?? []).filter((l) => l.log_date === today);
  const yesterdayLogs = (recentLogs ?? []).filter((l) => l.log_date !== today);

  const maintenanceKcal =
    target.tdee ??
    (target.weight_kg && target.age && target.sex && target.activity_level
      ? estimateMaintenanceKcal(
          target.weight_kg,
          target.age,
          target.sex,
          target.activity_level as ActivityLevel
        )
      : null);

  const pantryStaples = (pantryRows ?? [])
    .filter((r) => r.in_stock)
    .map((r) => r.item_key as PantryStapleKey)
    .filter((key) => PANTRY_STAPLES.some((s) => s.key === key));

  const recommendation = target.goal
    ? recommendToday({
        region: (target.region as RegionKey) ?? null,
        diet: (target.diet as DietKey) ?? "veg",
        goal: target.goal as GoalKey,
        maintenanceKcal,
        conditions: (conditionRows ?? []).map((c) => c.condition as ConditionKey),
        recentDishIds: (recentLogs ?? []).map((l) => l.dish_id),
        pantryStaples,
        isBusy: contextRow?.is_busy ?? false,
        budgetPref: (contextRow?.budget_pref as CostTier | null) ?? null,
      })
    : null;

  return NextResponse.json({
    recommendation,
    todayLogs,
    yesterdayLogs,
    context: contextRow ?? { is_busy: false, budget_pref: null },
    goalSet: !!target.goal,
  });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthedSupabase(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const body = await request.json();
  const { dish_id, meal_time, family_member_id, source } = body ?? {};

  if (typeof dish_id !== "string" || !dish_id.trim()) {
    return NextResponse.json({ error: "A dish_id is required." }, { status: 400 });
  }
  if (!["breakfast", "lunch", "dinner", "snack"].includes(meal_time)) {
    return NextResponse.json({ error: "A valid meal_time is required." }, { status: 400 });
  }

  if (family_member_id) {
    const { data: fm } = await supabase
      .from("family_members")
      .select("id")
      .eq("id", family_member_id)
      .eq("account_id", user.id)
      .maybeSingle();
    if (!fm) return NextResponse.json({ error: "Not your family member." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("daily_meal_logs")
    .insert({
      user_id: user.id,
      family_member_id: family_member_id ?? null,
      dish_id,
      meal_time,
      source: ["scan", "manual", "recommended"].includes(source) ? source : "manual",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const auth = await getAuthedSupabase(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "A log id is required." }, { status: 400 });

  const { error } = await supabase.from("daily_meal_logs").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest) {
  const auth = await getAuthedSupabase(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const body = await request.json();
  const { is_busy, budget_pref } = body ?? {};

  if (budget_pref != null && !["budget", "moderate", "premium"].includes(budget_pref)) {
    return NextResponse.json({ error: "Invalid budget_pref." }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("daily_context")
    .upsert(
      {
        user_id: user.id,
        context_date: today,
        ...(typeof is_busy === "boolean" ? { is_busy } : {}),
        ...(budget_pref !== undefined ? { budget_pref } : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,context_date" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
