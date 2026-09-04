"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HeartHandshake, X } from "lucide-react";
import { browserClient } from "@/lib/supabase-browser";
import { MEAL_TIME_LABEL, type MealTime } from "@/lib/poshan-data";

interface PatientLink {
  id: string;
  clinician_id: string;
  status: "pending" | "active" | "revoked";
  linked_at: string | null;
}

interface ClinicianInfo {
  id: string;
  full_name: string;
  specialty: string | null;
}

interface ClinicBranding {
  name: string;
  logo_url: string | null;
}

interface CarePlan {
  id: string;
  clinician_id: string;
  status: "approved" | "sent";
  plan_json: {
    dishes: { id: string; name: { en: string; hi: string }; time: MealTime; kcal: number }[];
    totalKcal: number;
    targetKcal: number;
  };
  approved_at: string | null;
  opened_by_patient_at: string | null;
}

/**
 * The patient's half of the clinician platform: redeem an invite code from
 * a clinician, see who currently has access and revoke it, and view any
 * plans a linked clinician has approved. Deliberately no draft plans ever
 * appear here — the API/RLS layer already guarantees that (care_plans has
 * no policy letting a patient read a 'draft' row), this component just
 * never asks for them.
 */
export function PatientCare({ userId }: { userId: string }) {
  const [links, setLinks] = useState<PatientLink[]>([]);
  const [clinicians, setClinicians] = useState<Record<string, ClinicianInfo>>({});
  /* Keyed by clinician_id, not clinic_id — that's how a plan's own
     clinician_id looks this up, and a clinic can have more than one
     clinician mapping to the same branding, which is fine, this map just
     ends up with duplicate values pointing at the same clinic. */
  const [clinicBranding, setClinicBranding] = useState<Record<string, ClinicBranding>>({});
  const [plans, setPlans] = useState<CarePlan[]>([]);
  /* "Patients get the plan in English or Hindi" (CLINIC_TIERS, poshan-data.ts)
     is a promise about the PLAN specifically, not the whole dashboard — the
     rest of /dashboard stays English-only by this app's existing convention,
     so this is scoped to profiles.lang rather than pulling the site-wide
     LangProvider into a page that has never used it. Defaults to "en" until
     the profile loads, matching profiles.lang's own DB default. */
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function load() {
    const supabase = browserClient();
    if (!supabase) return;

    const { data: profile } = await supabase.from("profiles").select("lang").eq("id", userId).maybeSingle();
    if (profile?.lang === "hi") setLang("hi");

    const { data: linkRows } = await supabase
      .from("patient_links")
      .select("id, clinician_id, status, linked_at")
      .eq("patient_id", userId)
      .eq("status", "active");
    setLinks(linkRows ?? []);

    const clinicianIds = (linkRows ?? []).map((l) => l.clinician_id);
    if (clinicianIds.length > 0) {
      const { data: rows } = await supabase
        .from("clinicians")
        .select("id, full_name, specialty")
        .in("id", clinicianIds);
      const map: Record<string, ClinicianInfo> = {};
      (rows ?? []).forEach((r) => (map[r.id] = r));
      setClinicians(map);

      /* "Your clinic's name and logo on patient-facing plans" (CLINIC_TIERS).
         A solo Practitioner clinician has no clinic_members row at all, so
         they simply don't appear in this result — branding.get(clinicianId)
         being undefined IS the "not part of a clinic" case, not an error. */
      const { data: memberships } = await supabase
        .from("clinic_members")
        .select("clinician_id, clinics(name, logo_url)")
        .in("clinician_id", clinicianIds);
      const brandingMap: Record<string, ClinicBranding> = {};
      (memberships ?? []).forEach((m) => {
        const clinic = m.clinics as unknown as ClinicBranding | null;
        if (clinic) brandingMap[m.clinician_id] = clinic;
      });
      setClinicBranding(brandingMap);
    }

    const { data: planRows } = await supabase
      .from("care_plans")
      .select("id, clinician_id, status, plan_json, approved_at, opened_by_patient_at")
      .eq("patient_id", userId)
      .order("approved_at", { ascending: false });
    setPlans(planRows ?? []);

    /* Adherence tracking: fire-and-forget, once per plan. The route itself
       is the source of truth on whether this actually changes anything —
       it only ever writes an unset timestamp once (`.is(...).null`), so
       calling it again on a plan the patient already opened is a defined
       no-op, not a bug to guard against here. */
    (planRows ?? [])
      .filter((p) => !p.opened_by_patient_at)
      .forEach((p) => {
        fetch(`/api/clinician/plans/${p.id}/opened`, { method: "POST" }).catch(() => {});
      });
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function redeem(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!code.trim()) return;
    setRedeeming(true);
    try {
      const res = await fetch("/api/clinician/patients/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not redeem that code.");
      setCode("");
      setSuccess("Linked — your clinician can now see the labs and plans they add for you.");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not redeem that code.");
    } finally {
      setRedeeming(false);
    }
  }

  async function revoke(id: string) {
    const res = await fetch("/api/clinician/patients/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) load();
  }

  return (
    <Card className="card-in border-[var(--line)] bg-[var(--surface)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2" style={{ color: "var(--ink)", fontFamily: "var(--font-display)" }}>
          <HeartHandshake className="h-5 w-5" style={{ color: "var(--kesar)" }} />
          Your clinicians
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={redeem} className="flex gap-2 mb-4">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter invite code from your clinician"
            className="flex-1 rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}
          />
          <button
            type="submit"
            disabled={redeeming}
            className="rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--kesar-fill)" }}
          >
            {redeeming ? "Linking…" : "Link"}
          </button>
        </form>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        {success && <p className="text-sm mb-3" style={{ color: "var(--ink)" }}>{success}</p>}

        {links.length === 0 ? (
          <p className="text-sm text-[var(--ink-soft)]">
            No clinician linked yet. Your clinician gives you a one-time code to enter above.
          </p>
        ) : (
          <div className="grid gap-2 mb-2">
            {links.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-lg p-3" style={{ background: "var(--roti-2, var(--roti))" }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                    Dr. {clinicians[l.clinician_id]?.full_name ?? "…"}
                  </p>
                  {clinicians[l.clinician_id]?.specialty && (
                    <p className="text-xs text-[var(--ink-soft)]">{clinicians[l.clinician_id]?.specialty}</p>
                  )}
                </div>
                <button
                  onClick={() => revoke(l.id)}
                  aria-label="Revoke access"
                  className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold"
                  style={{ color: "var(--ink-soft)", border: "1px solid var(--line)" }}
                >
                  <X className="h-3.5 w-3.5" /> Revoke
                </button>
              </div>
            ))}
          </div>
        )}

        {plans.length > 0 && (
          <div className="mt-5 border-t pt-4" style={{ borderColor: "var(--line)" }}>
            <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--ink)" }}>Plans from your clinician</h3>
            <div className="grid gap-3">
              {plans.map((p) => {
                const branding = clinicBranding[p.clinician_id];
                return (
                  <div key={p.id} className="rounded-lg p-3" style={{ background: "var(--roti-2, var(--roti))" }}>
                    {branding ? (
                      <div className="mb-2 flex items-center gap-2 border-b pb-2" style={{ borderColor: "var(--line)" }}>
                        {branding.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element -- a clinic-supplied logo URL, not a static asset next/image can optimise ahead of time
                          <img src={branding.logo_url} alt="" className="h-6 w-6 rounded object-contain" />
                        ) : null}
                        <span className="text-xs font-semibold" style={{ color: "var(--ink)" }}>{branding.name}</span>
                      </div>
                    ) : (
                      <p className="mb-2 text-xs font-semibold" style={{ color: "var(--ink)" }}>
                        Dr. {clinicians[p.clinician_id]?.full_name ?? "…"}
                      </p>
                    )}
                    <div className="grid gap-1 text-sm" style={{ color: "var(--ink)" }}>
                      {p.plan_json.dishes.map((d) => (
                        <div key={d.id} className="flex justify-between">
                          <span>{MEAL_TIME_LABEL[d.time][lang]}: {d.name[lang]}</span>
                          <span>{d.kcal} kcal</span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-[var(--ink-soft)]">
                      {p.approved_at && `Approved ${new Date(p.approved_at).toLocaleDateString()}`}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
