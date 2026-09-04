import { NextRequest, NextResponse } from "next/server";
import { requireClinician } from "@/lib/api-auth";
import { serviceClient } from "@/lib/supabase";

/**
 * Adds a verified clinician to my clinic by registration number, rather
 * than an out-of-band invite code — a clinic admin already knows who their
 * own staff are and coordinates with them directly, so this skips a whole
 * second invite/redeem flow for what's an internal team action, not a
 * consent relationship the way the patient link is.
 */
export async function POST(request: NextRequest) {
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
    return NextResponse.json({ error: "Only the clinic admin can add clinicians." }, { status: 403 });
  }

  const body = await request.json();
  const registrationNumber = typeof body?.registration_number === "string" ? body.registration_number.trim() : "";
  if (!registrationNumber) {
    return NextResponse.json({ error: "A registration number is required." }, { status: 400 });
  }

  const service = serviceClient();
  if (!service) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  /* Service role: looking up another clinician by registration number has
     to bypass "read own clinician row" (clinicians has no policy letting
     one clinician read another's row directly) — the admin-only gate above
     is what makes that safe here, not RLS. */
  const { data: target } = await service
    .from("clinicians")
    .select("id, full_name, verified_at")
    .eq("registration_number", registrationNumber)
    .maybeSingle();

  if (!target || !target.verified_at) {
    return NextResponse.json(
      { error: "No verified clinician found with that registration number." },
      { status: 404 }
    );
  }

  const { data: existingMembership } = await service
    .from("clinic_members")
    .select("id")
    .eq("clinician_id", target.id)
    .maybeSingle();
  if (existingMembership) {
    return NextResponse.json({ error: "That clinician already belongs to a clinic." }, { status: 409 });
  }

  const { data, error } = await service
    .from("clinic_members")
    .insert({ clinic_id: membership.clinic_id, clinician_id: target.id, role: "member" })
    .select("*, clinicians(full_name, specialty)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

/** Assigns (or clears, with department_id: null) a member's department —
 *  "departments... kept separate" (CLINIC_TIERS). This one field is what
 *  has_shared_patient_access() reads to decide who shares a patient list
 *  with whom once a clinic has any departments at all. */
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
    return NextResponse.json({ error: "Only the clinic admin can assign departments." }, { status: 403 });
  }

  const body = await request.json();
  const memberId = typeof body?.id === "string" ? body.id : null;
  const departmentId = typeof body?.department_id === "string" ? body.department_id : null;
  if (!memberId) return NextResponse.json({ error: "A member id is required." }, { status: 400 });

  const service = serviceClient();
  if (!service) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  if (departmentId) {
    const { data: department } = await service
      .from("departments")
      .select("id")
      .eq("id", departmentId)
      .eq("clinic_id", membership.clinic_id)
      .maybeSingle();
    if (!department) return NextResponse.json({ error: "That department isn't in your clinic." }, { status: 400 });
  }

  const { data, error } = await service
    .from("clinic_members")
    .update({ department_id: departmentId })
    .eq("id", memberId)
    .eq("clinic_id", membership.clinic_id)
    .select("*, clinicians(full_name, specialty)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

/** Removes a clinician from my clinic. The owner can't be removed this way
 *  — a clinic without its owner is an unmodelled state this route simply
 *  refuses to create rather than guessing what should happen instead. */
export async function DELETE(request: NextRequest) {
  const auth = await requireClinician(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const memberId = request.nextUrl.searchParams.get("id");
  if (!memberId) return NextResponse.json({ error: "A member id is required." }, { status: 400 });

  const { data: membership } = await supabase
    .from("clinic_members")
    .select("clinic_id, role")
    .eq("clinician_id", user.id)
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "Not a member of any clinic." }, { status: 403 });
  if (membership.role !== "admin") {
    return NextResponse.json({ error: "Only the clinic admin can remove clinicians." }, { status: 403 });
  }

  const service = serviceClient();
  if (!service) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const { data: clinic } = await service.from("clinics").select("owner_id").eq("id", membership.clinic_id).single();
  const { data: target } = await service.from("clinic_members").select("clinician_id").eq("id", memberId).single();
  if (target && clinic && target.clinician_id === clinic.owner_id) {
    return NextResponse.json({ error: "The clinic owner can't be removed." }, { status: 400 });
  }

  const { error } = await service
    .from("clinic_members")
    .delete()
    .eq("id", memberId)
    .eq("clinic_id", membership.clinic_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
