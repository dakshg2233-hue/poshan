import { NextRequest, NextResponse } from "next/server";
import { requireClinician } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit-log";

/**
 * The print/export view (src/app/clinician/print/[patientId]) reads
 * directly via the browser Supabase client, not through an API route — so
 * unlike labs/plans/patients, there's no natural server-side place to log
 * "exported as PDF" from. This is that place: the print page calls it once
 * its data has actually loaded.
 */
export async function POST(request: NextRequest) {
  const auth = await requireClinician(request);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const body = await request.json();
  const patientId = typeof body?.patient_id === "string" ? body.patient_id : undefined;

  await logAudit({ actorId: user.id, patientId, action: "export_pdf" });
  return NextResponse.json({ ok: true });
}
