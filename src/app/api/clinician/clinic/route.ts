import { NextRequest, NextResponse } from "next/server";
import { requireClinician } from "@/lib/api-auth";
import { serviceClient } from "@/lib/supabase";

/**
 * My clinic, if I'm in one. Distinct from requireClinicMember's 403-on-
 * missing-membership behaviour: this route needs to answer "do I have one"
 * rather than reject when the answer is no, since the /clinician UI uses
 * the null case to offer "create a clinic" instead of erroring.
 */
export async function GET(request: NextRequest) {
  const auth = await requireClinician(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data: membership } = await supabase
    .from("clinic_members")
    .select("*, clinics(*)")
    .eq("clinician_id", user.id)
    .maybeSingle();

  if (!membership) return NextResponse.json(null);

  const [{ data: roster }, { data: departments }] = await Promise.all([
    supabase
      .from("clinic_members")
      .select("*, clinicians(full_name, specialty)")
      .eq("clinic_id", membership.clinic_id),
    supabase.from("departments").select("*").eq("clinic_id", membership.clinic_id).order("name"),
  ]);

  return NextResponse.json({ ...membership, roster: roster ?? [], departments: departments ?? [] });
}

/**
 * Creates a clinic and makes the caller its owner + admin, via the service
 * role — clinics/clinic_members have no client insert policy (schema
 * comment: "clinic creation and edits ... go through a service-role API
 * route"). Bootstraps Clinic tier without waiting on Razorpay billing for
 * this tier, same as Practitioner: nothing here is gated on payment
 * because payment isn't wired for either tier yet, and blocking the
 * feature on an integration that doesn't exist would just make it
 * untestable for no safety benefit.
 */
export async function POST(request: NextRequest) {
  const auth = await requireClinician(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data: existing } = await supabase
    .from("clinic_members")
    .select("id")
    .eq("clinician_id", user.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "You already belong to a clinic." }, { status: 409 });
  }

  const body = await request.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "A clinic name is required." }, { status: 400 });

  const service = serviceClient();
  if (!service) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const { data: clinic, error: clinicError } = await service
    .from("clinics")
    .insert({ name, owner_id: user.id })
    .select()
    .single();
  if (clinicError) return NextResponse.json({ error: clinicError.message }, { status: 400 });

  const { data: membership, error: memberError } = await service
    .from("clinic_members")
    .insert({ clinic_id: clinic.id, clinician_id: user.id, role: "admin" })
    .select()
    .single();
  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 400 });

  return NextResponse.json({ ...membership, clinics: clinic });
}

/** Branding — "your clinic's name and logo on patient-facing plans"
 *  (CLINIC_TIERS). Admin-only, checked here since clinics has no update
 *  policy of its own. */
export async function PATCH(request: NextRequest) {
  const auth = await requireClinician(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data: membership } = await supabase
    .from("clinic_members")
    .select("clinic_id, role")
    .eq("clinician_id", user.id)
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "Not a member of any clinic." }, { status: 403 });
  if (membership.role !== "admin") {
    return NextResponse.json({ error: "Only the clinic admin can edit branding." }, { status: 403 });
  }

  const body = await request.json();
  const updates: { name?: string; logo_url?: string | null } = {};
  if (typeof body?.name === "string" && body.name.trim()) updates.name = body.name.trim();
  if (typeof body?.logo_url === "string" || body?.logo_url === null) updates.logo_url = body.logo_url;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const service = serviceClient();
  if (!service) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const { data, error } = await service
    .from("clinics")
    .update(updates)
    .eq("id", membership.clinic_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
