import { NextRequest, NextResponse } from "next/server";
import { requireClinicMember } from "@/lib/api-auth";

const MEAL_TIMES = ["breakfast", "lunch", "dinner", "snack"] as const;

export async function GET(request: NextRequest) {
  const auth = await requireClinicMember(request);
  if ("error" in auth) return auth.error;
  const { supabase, membership } = auth;

  const { data, error } = await supabase
    .from("plan_templates")
    .select("*")
    .eq("clinic_id", membership.clinic_id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

/**
 * Templates store a dish list only — never a patient. Applying one still
 * has to go back through draftCarePlan()'s checkMealAll() pass for whoever
 * the plan is actually for (see /api/clinician/plans), so a dish that's
 * fine for the patient a template was first written for can't silently
 * skip the safety check for a different patient with different conditions.
 */
export async function POST(request: NextRequest) {
  const auth = await requireClinicMember(request);
  if ("error" in auth) return auth.error;
  const { supabase, user, membership } = auth;

  const body = await request.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const dishes = Array.isArray(body?.dishes) ? body.dishes : null;

  if (!name || !dishes || dishes.length === 0) {
    return NextResponse.json({ error: "A name and at least one dish are required." }, { status: 400 });
  }
  for (const d of dishes) {
    if (typeof d?.id !== "string" || !(MEAL_TIMES as readonly string[]).includes(d?.time)) {
      return NextResponse.json({ error: "Each dish needs a valid id and time." }, { status: 400 });
    }
  }

  const { data, error } = await supabase
    .from("plan_templates")
    .insert({ clinic_id: membership.clinic_id, created_by: user.id, name, dishes })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const auth = await requireClinicMember(request);
  if ("error" in auth) return auth.error;
  const { supabase, membership } = auth;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "A template id is required." }, { status: 400 });

  const { error } = await supabase.from("plan_templates").delete().eq("id", id).eq("clinic_id", membership.clinic_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
