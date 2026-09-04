import { NextRequest, NextResponse } from "next/server";
import { requireClinician } from "@/lib/api-auth";
import { logAudit } from "@/lib/audit-log";

/**
 * The sign-off. Snapshots the clinician's registration number onto the row
 * at approval time (not a live join to clinicians.registration_number) so
 * a later change to how they're registered never silently rewrites a past
 * sign-off — same reasoning as the migration comment on
 * care_plans.approved_by_reg_number.
 *
 * No .eq("clinician_id", user.id) filter — a prior version had one, which
 * silently blocked the exact thing the Clinic-tier "clinic member approves
 * patient plans via shared access" RLS policy exists to allow: a colleague
 * approving a plan a teammate drafted, matching "reassign a patient when a
 * clinician is away." RLS (status = 'draft' -> 'approved', plus
 * has_shared_patient_access()) is the real gate; this route just needs to
 * not re-narrow it with an app-level filter RLS doesn't have.
 *
 * Params typed inline rather than via the RouteContext<'...'> helper: this
 * repo's Next.js type generation doesn't reliably produce those helpers
 * yet (see the pre-existing LayoutProps gap), so the plain Promise shape
 * from the Next.js docs is used directly instead of depending on it.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireClinician(request);
  if ("error" in auth) return auth.error;
  const { supabase, user, clinician } = auth;
  const { id } = await params;

  const { data, error } = await supabase
    .from("care_plans")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by_reg_number: clinician.registration_number,
    })
    .eq("id", id)
    .eq("status", "draft") // matches the RLS policy's own using()/with check() clause
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) {
    return NextResponse.json(
      { error: "Plan not found, not yours, or already approved." },
      { status: 404 }
    );
  }
  await logAudit({ actorId: user.id, patientId: data.patient_id, action: "approve_plan" });
  return NextResponse.json(data);
}
