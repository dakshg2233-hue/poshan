import { NextRequest, NextResponse } from "next/server";
import { requireClinicMember } from "@/lib/api-auth";
import { serviceClient } from "@/lib/supabase";

/**
 * Creating the FIRST department on a clinic is the switch that flips
 * has_shared_patient_access() (hospital-departments migration) from
 * clinic-wide sharing to department-scoped sharing — there's no separate
 * "enable departments" toggle, the existence of a department row IS the
 * toggle. Admin-only, service role: departments has no client insert
 * policy, same reasoning as clinics and clinic_members.
 */
export async function POST(request: NextRequest) {
  const auth = await requireClinicMember(request);
  if ("error" in auth) return auth.error;
  const { membership } = auth;

  if (membership.role !== "admin") {
    return NextResponse.json({ error: "Only the clinic admin can create departments." }, { status: 403 });
  }

  const body = await request.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "A department name is required." }, { status: 400 });

  const service = serviceClient();
  if (!service) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const { data, error } = await service
    .from("departments")
    .insert({ clinic_id: membership.clinic_id, name })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A department with that name already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}
