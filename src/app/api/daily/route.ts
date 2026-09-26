import { NextRequest, NextResponse } from "next/server";
import { isMinor } from "@/lib/dpdp";
import { getAuthedSupabase } from "@/lib/api-auth";
import { recommendToday, PANTRY_STAPLES, type PantryStapleKey, type CostTier, type DayType } from "@/lib/daily-engine";
import { bmiOf, estimateMaintenanceKcal, type ActivityLevel } from "@/lib/energy-requirement";
import type { GoalKey, DietKey, RegionKey } from "@/lib/poshan-data";
import type { ConditionKey } from "@/lib/conditions";
import { daysAgo, today as todayIst } from "@/lib/day";

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

  /* DPDP s.9(1) — a child's data may not be processed until a guardian has
     verifiably consented, and building a meal plan from their age, height
     and weight is exactly the processing the section means.
     
     Inert rather than invisible, and the choice matters. Hiding an
     unconsented child's profile entirely would read to the account holder
     as data loss, and the obvious response to data loss is to type it in
     again — which manufactures more unconsented children's data than
     leaving it visible ever would. So the profile stays where they put it,
     the name they typed is still shown back to them, and only the
     processing stops.
     
     Returns 200 with a reason rather than an error status: nothing has gone
     wrong, a permission is outstanding, and the client needs to render a
     "waiting for their guardian" state rather than a failure. */
  if (familyMemberId && isMinor({ age: (target as { age?: number | null }).age ?? null }) === true) {
    const { data: consent } = await supabase
      .from("parental_consents")
      .select("id")
      .eq("family_member_id", familyMemberId)
      .not("verified_at", "is", null)
      .is("revoked_at", null)
      .maybeSingle();

    if (!consent) {
      return NextResponse.json({
        blocked: "awaiting_parental_consent",
        familyMemberId,
        name: (target as { full_name?: string }).full_name ?? null,
        message:
          "We need a parent or guardian's permission before we can build a plan " +
          "for anyone under 18. Once they confirm, this works normally.",
      });
    }
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
        .gte("log_date", daysAgo(2))
        .order("log_date", { ascending: false }),
      supabase.from("pantry_items").select("item_key, in_stock").eq("user_id", user.id),
      supabase
        .from("daily_context")
        .select("*")
        .eq("user_id", user.id)
        .eq("context_date", todayIst())
        .maybeSingle(),
    ]);

  const today = todayIst();
  const todayLogs = (recentLogs ?? []).filter((l) => l.log_date === today);
  const yesterdayLogs = (recentLogs ?? []).filter((l) => l.log_date !== today);

  /* Computed from the body when the profile has what it needs, and the
     saved tdee only as a fallback. The saved figure is a snapshot of
     whatever formula onboarding ran at the time, so it goes stale when the
     model is corrected (26 September 2026: obese and underweight
     estimates) or when the person's weight changes. */
  const maintenanceKcal =
    (target.weight_kg && target.age && target.sex && target.activity_level
      ? estimateMaintenanceKcal(
          target.weight_kg,
          target.age,
          target.sex,
          target.activity_level as ActivityLevel,
          target.height_cm
        )
      : null) ?? target.tdee;
  const bmi = bmiOf(target.weight_kg, target.height_cm);

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
        bmi,
        conditions: (conditionRows ?? []).map((c) => c.condition as ConditionKey),
        recentDishIds: (recentLogs ?? []).map((l) => l.dish_id),
        pantryStaples,
        isBusy: contextRow?.is_busy ?? false,
        budgetPref: (contextRow?.budget_pref as CostTier | null) ?? null,
        dayType: (contextRow?.day_type as DayType | undefined) ?? "normal",
        festivalName: contextRow?.festival_name ?? undefined,
      })
    : null;

  return NextResponse.json({
    recommendation,
    todayLogs,
    yesterdayLogs,
    context: contextRow ?? { is_busy: false, budget_pref: null, day_type: "normal", festival_name: null },
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
      source: ["scan", "manual", "recommended", "voice"].includes(source) ? source : "manual",
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
  const { is_busy, budget_pref, day_type, festival_name } = body ?? {};

  if (budget_pref != null && !["budget", "moderate", "premium"].includes(budget_pref)) {
    return NextResponse.json({ error: "Invalid budget_pref." }, { status: 400 });
  }
  if (day_type != null && !["normal", "vrat", "festival"].includes(day_type)) {
    return NextResponse.json({ error: "Invalid day_type." }, { status: 400 });
  }

  const today = todayIst();
  const { data, error } = await supabase
    .from("daily_context")
    .upsert(
      {
        user_id: user.id,
        context_date: today,
        ...(typeof is_busy === "boolean" ? { is_busy } : {}),
        ...(budget_pref !== undefined ? { budget_pref } : {}),
        ...(day_type !== undefined ? { day_type } : {}),
        ...(festival_name !== undefined ? { festival_name } : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,context_date" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
