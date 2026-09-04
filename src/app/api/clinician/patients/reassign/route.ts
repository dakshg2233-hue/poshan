import { NextRequest, NextResponse } from "next/server";
import { requireClinicMember } from "@/lib/api-auth";
import { serviceClient } from "@/lib/supabase";

/**
 * "Reassign a patient when a clinician is away" (CLINIC_TIERS). Moves
 * patient_links.clinician_id to a colleague — invited_by is left untouched
 * as the historical record of who actually created the consent
 * relationship, only the current point of contact changes. Service role
 * because verifying the new clinician is in the SAME clinic is exactly the
 * kind of check a bare RLS update policy can't express without repeating
 * has_shared_patient_access's join inline here too.
 */
export async function POST(request: NextRequest) {
  const auth = await requireClinicMember(request);
  if ("error" in auth) return auth.error;
  const { membership } = auth;

  const body = await request.json();
  const linkId = typeof body?.link_id === "string" ? body.link_id : null;
  const newClinicianId = typeof body?.clinician_id === "string" ? body.clinician_id : null;
  if (!linkId || !newClinicianId) {
    return NextResponse.json({ error: "link_id and clinician_id are required." }, { status: 400 });
  }

  const service = serviceClient();
  if (!service) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const { data: newColleague } = await service
    .from("clinic_members")
    .select("clinic_id")
    .eq("clinician_id", newClinicianId)
    .maybeSingle();
  if (!newColleague || newColleague.clinic_id !== membership.clinic_id) {
    return NextResponse.json({ error: "That clinician isn't in your clinic." }, { status: 400 });
  }

  const { data: link } = await service
    .from("patient_links")
    .select("id, clinician_id")
    .eq("id", linkId)
    .maybeSingle();
  if (!link) return NextResponse.json({ error: "Patient link not found." }, { status: 404 });

  const { data: currentOwner } = await service
    .from("clinic_members")
    .select("clinic_id")
    .eq("clinician_id", link.clinician_id)
    .maybeSingle();
  if (!currentOwner || currentOwner.clinic_id !== membership.clinic_id) {
    return NextResponse.json({ error: "That patient isn't with your clinic." }, { status: 403 });
  }

  const { data, error } = await service
    .from("patient_links")
    .update({ clinician_id: newClinicianId })
    .eq("id", linkId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
