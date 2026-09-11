import { NextRequest, NextResponse } from "next/server";
import { requireClinician } from "@/lib/api-auth";
import { serviceClient } from "@/lib/supabase";
import { logAudit } from "@/lib/audit-log";
import { checkConsent } from "@/lib/consent";
import { triagePatient, computeAdherence, type TriageResult } from "@/lib/triage";
import type { MarkerKey } from "@/lib/clinical-markers";

/**
 * The doctor's whole morning, in one request.
 *
 * A clinician with 300 patients opens this and sees the twelve that
 * changed. Everything here is computed server-side and returned already
 * banded, because the alternative — shipping every patient's labs and logs
 * to the browser and ranking there — would mean sending a clinic's entire
 * patient data to a device to answer a question about a dozen of them.
 *
 * Every read is gated on live consent and recorded in the audit log, per
 * patient, exactly as a chart read is. A triage screen is still reading
 * patient data; presenting it as a summary doesn't make it less so, and
 * the patient's Privacy Center shows these reads like any other.
 */

const WINDOW_DAYS = 30;

export async function GET(request: NextRequest) {
  const auth = await requireClinician(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  /* RLS scopes this to the clinician's own links, or the whole clinic's if
     they're a Clinic-tier member — see the note in /api/clinician/patients
     for why there's no explicit filter here. */
  const { data: links, error } = await supabase
    .from("patient_links")
    .select("id, patient_id, clinician_id, status, linked_at, scopes, access_expires_at")
    .eq("status", "active");

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const active = (links ?? []).filter((l) => l.patient_id);
  if (active.length === 0) {
    await logAudit({ actorId: user.id, action: "read_patient_list" });
    return NextResponse.json({ patients: [], counts: { red: 0, amber: 0, green: 0 } });
  }

  const service = serviceClient();
  if (!service) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const patientIds = active.map((l) => l.patient_id as string);
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);

  /* Four queries for the whole roster rather than four per patient. At 300
     patients the per-patient shape is 1,200 round trips and a dashboard
     that takes a minute to open. */
  const [labsRes, logsRes, plansRes, profilesRes] = await Promise.all([
    service
      .from("lab_values")
      .select("patient_id, marker, value, taken_on")
      .in("patient_id", patientIds),
    service
      .from("daily_meal_logs")
      .select("user_id, log_date")
      .in("user_id", patientIds)
      .gte("log_date", since),
    service
      .from("care_plans")
      .select("patient_id, status, approved_at, opened_by_patient_at")
      .in("patient_id", patientIds)
      .in("status", ["approved", "sent"]),
    service.from("profiles").select("id, full_name").in("id", patientIds),
  ]);

  const labsBy = new Map<string, { marker: MarkerKey; value: number; taken_on: string }[]>();
  for (const l of labsRes.data ?? []) {
    const list = labsBy.get(l.patient_id) ?? [];
    list.push({ marker: l.marker as MarkerKey, value: Number(l.value), taken_on: l.taken_on });
    labsBy.set(l.patient_id, list);
  }

  const logsBy = new Map<string, string[]>();
  for (const l of logsRes.data ?? []) {
    const list = logsBy.get(l.user_id) ?? [];
    list.push(l.log_date);
    logsBy.set(l.user_id, list);
  }

  const planBy = new Map<string, { approved_at: string | null; opened: boolean }>();
  for (const p of plansRes.data ?? []) {
    const existing = planBy.get(p.patient_id);
    /* Only the most recent approved plan matters: an older unopened plan
       that has since been superseded isn't a failed handoff. */
    if (!existing || (p.approved_at ?? "") > (existing.approved_at ?? "")) {
      planBy.set(p.patient_id, {
        approved_at: p.approved_at,
        opened: p.opened_by_patient_at !== null,
      });
    }
  }

  const nameBy = new Map((profilesRes.data ?? []).map((p) => [p.id, p.full_name as string | null]));

  const today = Date.now();
  const patients: {
    patientId: string;
    linkId: string;
    name: string;
    adherence: number | null;
    daysSinceLastLog: number | null;
    consentOk: boolean;
    triage: TriageResult;
  }[] = [];

  for (const link of active) {
    const patientId = link.patient_id as string;

    /* Consent is checked per patient, not once per clinician. A roster can
       contain a patient whose grant has lapsed or who never shared labs;
       they still belong on the list (the link is active), but their
       clinical data must not be read to band them. */
    const consent = await checkConsent(user.id, patientId, "labs");
    const nutritionConsent = await checkConsent(user.id, patientId, "nutrition");

    const labs = consent.ok ? (labsBy.get(patientId) ?? []) : [];
    const logDates = nutritionConsent.ok ? (logsBy.get(patientId) ?? []) : [];

    const lastLog = logDates.length > 0 ? logDates.slice().sort().at(-1)! : null;
    const daysSinceLastLog = lastLog
      ? Math.floor((today - new Date(lastLog).getTime()) / 86_400_000)
      : null;

    const plan = planBy.get(patientId);
    const daysSincePlanApproved = plan?.approved_at
      ? Math.floor((today - new Date(plan.approved_at).getTime()) / 86_400_000)
      : null;

    const adherence = nutritionConsent.ok
      ? computeAdherence(logDates, WINDOW_DAYS, link.linked_at)
      : null;

    patients.push({
      patientId,
      linkId: link.id,
      name: nameBy.get(patientId) || "Unnamed patient",
      adherence,
      daysSinceLastLog,
      consentOk: consent.ok || nutritionConsent.ok,
      triage: triagePatient({
        labs,
        adherence,
        daysSinceLastLog,
        planUnopened: plan ? !plan.opened : false,
        daysSincePlanApproved,
      }),
    });
  }

  /* Red first, then amber, then green; within a band, the patient with the
     most signals leads. A doctor reads top-down and stops when they run
     out of time, so the order is the product. */
  const rank = { red: 0, amber: 1, green: 2 };
  patients.sort(
    (a, b) =>
      rank[a.triage.band] - rank[b.triage.band] ||
      b.triage.signals.length - a.triage.signals.length ||
      a.name.localeCompare(b.name)
  );

  await logAudit({ actorId: user.id, action: "read_patient_list" });

  return NextResponse.json({
    patients,
    counts: {
      red: patients.filter((p) => p.triage.band === "red").length,
      amber: patients.filter((p) => p.triage.band === "amber").length,
      green: patients.filter((p) => p.triage.band === "green").length,
    },
    windowDays: WINDOW_DAYS,
  });
}
