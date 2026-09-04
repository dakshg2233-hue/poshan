import { NextRequest, NextResponse } from "next/server";
import { requireClinician } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit-log";

const MARKERS = ["hba1c", "creatinine", "egfr", "haemoglobin", "ldl", "hdl", "triglycerides"] as const;

/**
 * Uses the plain authenticated client, not the service role: the RLS
 * policies on lab_values ("linked clinician reads/inserts patient labs")
 * already enforce exactly the access this route needs — an active
 * patient_links row between the caller and the target patient — so there
 * is nothing to bypass. A clinician who tries this against an unlinked or
 * revoked patient gets rejected by Postgres, not by application logic that
 * could drift out of sync with it.
 */
export async function GET(request: NextRequest) {
  const auth = await requireClinician(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const patientId = request.nextUrl.searchParams.get("patient_id");
  if (!patientId) return NextResponse.json({ error: "patient_id is required." }, { status: 400 });

  const { data, error } = await supabase
    .from("lab_values")
    .select("*")
    .eq("patient_id", patientId)
    .order("taken_on", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await logAudit({ actorId: user.id, patientId, action: "read_labs" });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const auth = await requireClinician(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const body = await request.json();
  const { patient_id, marker, value, unit, taken_on } = body ?? {};

  if (
    typeof patient_id !== "string" ||
    typeof marker !== "string" || !(MARKERS as readonly string[]).includes(marker) ||
    typeof value !== "number" || !Number.isFinite(value) ||
    typeof unit !== "string" || !unit.trim() ||
    typeof taken_on !== "string"
  ) {
    return NextResponse.json({ error: "patient_id, a valid marker, value, unit and taken_on are required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("lab_values")
    .insert({ patient_id, entered_by: user.id, marker, value, unit, taken_on })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await logAudit({ actorId: user.id, patientId: patient_id, action: "add_lab" });
  return NextResponse.json(data);
}
