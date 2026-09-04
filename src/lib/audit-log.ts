import { serviceClient } from "./supabase";

export type AuditAction =
  | "read_patient_list"
  | "read_labs"
  | "read_plan"
  | "add_lab"
  | "draft_plan"
  | "approve_plan"
  | "export_pdf";

/**
 * "Full audit trail: who read what, who approved what, when" (CLINIC_TIERS,
 * poshan-data.ts). Only writes when the acting clinician actually belongs
 * to a clinic that has at least one department — a solo Practitioner or a
 * flat Clinic-tier org gets no audit rows at all, matching the promise
 * being specifically a Hospital-tier one, not something every account pays
 * the write cost for.
 *
 * Best-effort and non-blocking on purpose: a logging failure must never be
 * the reason a real clinical action (reading a chart, approving a plan)
 * fails. The audit trail's job is to record what happened, not to gate it.
 */
export async function logAudit(params: {
  actorId: string;
  patientId?: string;
  action: AuditAction;
}) {
  try {
    const service = serviceClient();
    if (!service) return;

    const { data: membership } = await service
      .from("clinic_members")
      .select("clinic_id")
      .eq("clinician_id", params.actorId)
      .maybeSingle();
    if (!membership) return;

    const { data: hasDepartments } = await service
      .from("departments")
      .select("id")
      .eq("clinic_id", membership.clinic_id)
      .limit(1)
      .maybeSingle();
    if (!hasDepartments) return;

    await service.from("audit_log").insert({
      clinic_id: membership.clinic_id,
      actor_id: params.actorId,
      patient_id: params.patientId ?? null,
      action: params.action,
    });
  } catch {
    // best-effort — see doc comment above
  }
}
