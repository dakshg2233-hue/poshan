import { NextRequest, NextResponse } from "next/server";
import { requireClinicMember } from "@/lib/api-auth";

/** Admin-only read — enforced by RLS ("clinic admin reads own clinic's
 *  audit log"), not just this check, but checking here first gives a clean
 *  403 with a real message instead of a bare empty array for a member who
 *  isn't admin. */
export async function GET(request: NextRequest) {
  const auth = await requireClinicMember(request);
  if ("error" in auth) return auth.error;
  const { supabase, membership } = auth;

  if (membership.role !== "admin") {
    return NextResponse.json({ error: "Only the clinic admin can view the audit trail." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("audit_log")
    .select("*, clinicians(full_name)")
    .eq("clinic_id", membership.clinic_id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
