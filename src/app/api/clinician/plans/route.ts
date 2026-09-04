import { NextRequest, NextResponse } from "next/server";
import { requireClinician } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit-log";
import { draftCarePlan } from "@/lib/clinician-plan";
import { estimateMaintenanceKcal, type ActivityLevel, type Sex } from "@/lib/energy-requirement";
import type { ConditionKey } from "@/lib/conditions";
import type { DietKey, GoalKey, RegionKey } from "@/lib/poshan-data";

export async function GET(request: NextRequest) {
  const auth = await requireClinician(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const patientId = request.nextUrl.searchParams.get("patient_id");
  let query = supabase.from("care_plans").select("*").order("created_at", { ascending: false });
  if (patientId) query = query.eq("patient_id", patientId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (patientId) await logAudit({ actorId: user.id, patientId, action: "read_plan" });
  return NextResponse.json(data);
}

/**
 * Drafts a plan from the patient's own profile + recorded conditions —
 * both now readable thanks to the "linked clinician reads patient
 * profile/conditions" policies — and real MEAL_LIBRARY dishes, safety-
 * checked via checkMealAll() inside draftCarePlan(). Nothing here reaches
 * the patient: care_plans.status starts 'draft', and there is no RLS
 * policy letting a patient see a draft (schema comment in the migration).
 */
export async function POST(request: NextRequest) {
  const auth = await requireClinician(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const body = await request.json();
  const patientId = typeof body?.patient_id === "string" ? body.patient_id : null;
  const templateId = typeof body?.template_id === "string" ? body.template_id : null;
  if (!patientId) return NextResponse.json({ error: "patient_id is required." }, { status: 400 });

  const [{ data: profile, error: profileError }, { data: conditionRows, error: conditionsError }, { data: labs }, { data: template }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", patientId).single(),
      supabase.from("user_conditions").select("condition").eq("user_id", patientId),
      supabase
        .from("lab_values")
        .select("id")
        .eq("patient_id", patientId)
        .order("taken_on", { ascending: false })
        .limit(10),
      templateId
        ? supabase.from("plan_templates").select("dishes").eq("id", templateId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  /* Either query failing here almost always means no active patient_links
     row exists for this clinician/patient pair — RLS returns zero rows
     rather than an error, which surfaces as .single() failing to find one. */
  if (profileError || !profile) {
    return NextResponse.json(
      { error: "Could not read that patient's profile — check they're still linked to you." },
      { status: 403 }
    );
  }
  if (conditionsError) {
    return NextResponse.json({ error: conditionsError.message }, { status: 400 });
  }

  const conditions = (conditionRows ?? []).map((r) => r.condition as ConditionKey);
  const maintenanceKcal =
    profile.weight_kg && profile.age && profile.sex && profile.activity_level
      ? estimateMaintenanceKcal(
          profile.weight_kg,
          profile.age,
          profile.sex as Sex,
          profile.activity_level as ActivityLevel
        )
      : null;

  const draft = draftCarePlan({
    region: (profile.region as RegionKey | null) ?? null,
    diet: (profile.diet as DietKey | null) ?? "veg",
    goal: (profile.goal as GoalKey | null) ?? "loss",
    maintenanceKcal,
    conditions,
    template: template?.dishes,
  });

  const { data, error } = await supabase
    .from("care_plans")
    .insert({
      patient_id: patientId,
      clinician_id: user.id,
      based_on_lab_ids: (labs ?? []).map((l) => l.id),
      plan_json: draft,
      safety_flags: draft.safetyFlags,
      status: "draft",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await logAudit({ actorId: user.id, patientId, action: "draft_plan" });
  return NextResponse.json(data);
}
