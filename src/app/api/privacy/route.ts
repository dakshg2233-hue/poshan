import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";
import { serviceClient } from "@/lib/supabase";
import { AUDIT_LABELS, type AuditAction } from "@/lib/audit-log";
import { SCOPE_LABELS, type ConsentScope } from "@/lib/consent";

/**
 * The Privacy Center's data: who has access to this patient's health data,
 * and who has actually opened it.
 *
 * Reads the same audit_log rows the Hospital tier's compliance export
 * reads — one record, two audiences. That is the point: a separate,
 * friendlier "access history" built for patients would be a second source
 * of truth about the same events, and the two would diverge exactly when
 * it mattered.
 *
 * Clinician names come through the service role because a patient has no
 * RLS path to the clinicians table (correctly — they should not be able to
 * enumerate clinicians). The service call is scoped to ids that already
 * appear in this patient's own rows, so it can only resolve names the
 * patient is by definition entitled to see.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthedSupabase(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const [{ data: accessRows }, { data: linkRows }] = await Promise.all([
    supabase
      .from("audit_log")
      .select("id, actor_id, action, created_at, clinic_id")
      .eq("patient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("patient_links")
      .select("id, clinician_id, status, scopes, purpose, access_expires_at, linked_at, revoked_at")
      .eq("patient_id", user.id)
      .order("linked_at", { ascending: false, nullsFirst: false }),
  ]);

  const access = accessRows ?? [];
  const links = linkRows ?? [];

  const clinicianIds = [
    ...new Set([...access.map((a) => a.actor_id), ...links.map((l) => l.clinician_id)].filter(Boolean)),
  ];
  const clinicIds = [...new Set(access.map((a) => a.clinic_id).filter(Boolean))];

  const service = serviceClient();
  const names = new Map<string, { name: string; specialty: string | null }>();
  const clinicNames = new Map<string, string>();

  if (service && clinicianIds.length > 0) {
    const { data } = await service
      .from("clinicians")
      .select("id, full_name, specialty")
      .in("id", clinicianIds);
    for (const c of data ?? []) {
      names.set(c.id, { name: c.full_name, specialty: c.specialty });
    }
  }
  if (service && clinicIds.length > 0) {
    const { data } = await service.from("clinics").select("id, name").in("id", clinicIds);
    for (const c of data ?? []) clinicNames.set(c.id, c.name);
  }

  const now = Date.now();

  return NextResponse.json({
    /* "Who opened my data, and when." */
    access: access.map((a) => ({
      id: a.id,
      who: names.get(a.actor_id)?.name ?? "A clinician",
      specialty: names.get(a.actor_id)?.specialty ?? null,
      clinic: a.clinic_id ? (clinicNames.get(a.clinic_id) ?? null) : null,
      action: a.action as AuditAction,
      label: AUDIT_LABELS[a.action as AuditAction] ?? { en: a.action, hi: a.action },
      at: a.created_at,
    })),

    /* "Who currently has access, to what, and until when." */
    permissions: links.map((l) => {
      const expired = l.access_expires_at ? new Date(l.access_expires_at).getTime() < now : false;
      return {
        id: l.id,
        who: names.get(l.clinician_id)?.name ?? "A clinician",
        specialty: names.get(l.clinician_id)?.specialty ?? null,
        /* A grant past its expiry is reported as expired even though the
           stored status is still 'active' — checkConsent() already refuses
           it, and showing "active" here would contradict what the system
           actually does. The row is left as-is rather than rewritten: the
           patient's history of what they granted should not be edited by a
           background process. */
        status: l.status === "active" && expired ? "expired" : l.status,
        scopes: ((l.scopes ?? []) as ConsentScope[]).map((s) => ({
          key: s,
          label: SCOPE_LABELS[s] ?? { en: s, hi: s },
        })),
        purpose: l.purpose,
        expiresAt: l.access_expires_at,
        linkedAt: l.linked_at,
        revokedAt: l.revoked_at,
      };
    }),
  });
}
