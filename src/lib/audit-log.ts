import { serviceClient } from "./supabase";

export type AuditAction =
  | "read_patient_list"
  | "read_labs"
  | "read_plan"
  | "add_lab"
  | "draft_plan"
  | "approve_plan"
  | "export_pdf"
  | "read_adherence"
  | "read_timeline"
  | "read_summary";

/** Patient-facing wording for the Privacy Center. The audit table stores
 *  the verb; this is how it reads to the person it happened to. */
export const AUDIT_LABELS: Record<AuditAction, { en: string; hi: string }> = {
  read_patient_list: { en: "Saw you on their patient list", hi: "अपनी मरीज़ सूची में आपको देखा" },
  read_labs: { en: "Opened your lab results", hi: "आपकी जाँच रिपोर्ट खोली" },
  read_plan: { en: "Opened your meal plan", hi: "आपका भोजन प्लान खोला" },
  add_lab: { en: "Added a lab result for you", hi: "आपके लिए जाँच परिणाम जोड़ा" },
  draft_plan: { en: "Drafted a meal plan for you", hi: "आपके लिए भोजन प्लान बनाया" },
  approve_plan: { en: "Approved your meal plan", hi: "आपका भोजन प्लान मंज़ूर किया" },
  export_pdf: { en: "Exported your history as a PDF", hi: "आपका इतिहास PDF में निर्यात किया" },
  read_adherence: { en: "Checked whether you opened your plan", hi: "देखा कि आपने प्लान खोला या नहीं" },
  read_timeline: { en: "Opened your health timeline", hi: "आपकी स्वास्थ्य समयरेखा खोली" },
  read_summary: { en: "Read an AI summary of your last 30 days", hi: "आपके पिछले 30 दिनों का AI सारांश पढ़ा" },
};

/**
 * Records that a clinician touched a patient's data — every clinician, at
 * every tier, every time.
 *
 * This used to write only for clinics that had at least one department,
 * which made it a Hospital-tier feature ("Full audit trail: who read what,
 * who approved what, when"). That was the right shape while the audience
 * for these rows was a hospital compliance officer. It is the wrong shape
 * now that the same rows answer the *patient's* question in the Privacy
 * Center, because a privacy guarantee that only applies at ₹39,999/month
 * is not a privacy guarantee. A solo practitioner's patient gets the same
 * record as a hospital's.
 *
 * The cost of removing the gate is one insert per clinician read. The cost
 * of keeping it was that ~every Poshan patient would open "who accessed my
 * health data?" and be shown an empty list that looked like an answer.
 *
 * Still best-effort and non-blocking on purpose: a logging failure must
 * never be the reason a real clinical action fails. The audit trail's job
 * is to record what happened, not to gate it — gating is checkConsent()'s
 * job, and that one does fail closed.
 */
export async function logAudit(params: {
  actorId: string;
  patientId?: string;
  action: AuditAction;
}) {
  try {
    const service = serviceClient();
    if (!service) return;

    /* Null clinic_id is a real state, not a missing one: it means the
       clinician acted as an individual practitioner rather than on behalf
       of a clinic. Worth distinguishing in the record — a patient reading
       their own log should be able to tell "Dr Sharma" from "Dr Sharma at
       Apollo". */
    const { data: membership } = await service
      .from("clinic_members")
      .select("clinic_id")
      .eq("clinician_id", params.actorId)
      .maybeSingle();

    await service.from("audit_log").insert({
      clinic_id: membership?.clinic_id ?? null,
      actor_id: params.actorId,
      patient_id: params.patientId ?? null,
      action: params.action,
    });
  } catch {
    // best-effort — see doc comment above
  }
}
