"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase-browser";
import { MARKER_LABEL } from "@/lib/clinical-markers";
import { MEAL_TIME_LABEL, type MealTime } from "@/lib/poshan-data";
import { Printer } from "lucide-react";

interface LabRow {
  id: string;
  marker: string;
  value: number;
  unit: string;
  taken_on: string;
}

interface PlanRow {
  id: string;
  status: string;
  plan_json: { dishes: { id: string; name: { en: string; hi: string }; time: MealTime; kcal: number }[]; totalKcal: number; targetKcal: number };
  approved_at: string | null;
  approved_by_reg_number: string | null;
}

type Lang = "en" | "hi";

/** Page chrome only — dish names and meal-time labels already carry both
 *  languages from MEAL_LIBRARY/MEAL_TIME_LABEL, this just covers the
 *  surrounding headings so the whole sheet reads in one language, not a
 *  patchwork. */
const TEXT: Record<string, Record<Lang, string>> = {
  title: { en: "Discharge Diet Sheet", hi: "छुट्टी आहार पत्रक" },
  exported: { en: "Exported", hi: "निर्यात किया गया" },
  labHistory: { en: "Lab history", hi: "जाँच इतिहास" },
  noLabs: { en: "No lab values recorded.", hi: "कोई जाँच मान दर्ज नहीं।" },
  marker: { en: "Marker", hi: "जाँच" },
  value: { en: "Value", hi: "मान" },
  date: { en: "Date", hi: "तारीख़" },
  approvedPlans: { en: "Approved plans", hi: "स्वीकृत योजनाएँ" },
  noPlans: { en: "No approved plans.", hi: "कोई स्वीकृत योजना नहीं।" },
  approved: { en: "Approved", hi: "स्वीकृत" },
  reg: { en: "Reg.", hi: "पंजी." },
  print: { en: "Print / Save as PDF", hi: "प्रिंट करें / PDF सहेजें" },
};

/**
 * "Export a patient's history as PDF for their file" (Clinic tier) and
 * "Discharge diet sheets, printed in the patient's language" (Hospital
 * tier) turn out to be the same artifact — a patient's diet history handed
 * over in their own language — so one view serves both rather than
 * building a second, near-identical page. Deliberately not a generated-
 * PDF-file feature either way: a print stylesheet plus the browser's own
 * Print > Save as PDF does the job losslessly with zero added dependencies.
 */
export default function ClinicianPrintPage({ params }: { params: Promise<{ patientId: string }> }) {
  const router = useRouter();
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState("");
  const [lang, setLang] = useState<Lang>("en");
  const [clinicName, setClinicName] = useState<string | null>(null);
  const [labs, setLabs] = useState<LabRow[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const t = (key: keyof typeof TEXT) => TEXT[key][lang];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { patientId: id } = await params;
      if (cancelled) return;
      setPatientId(id);

      const supabase = browserClient();
      if (!supabase) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      /* Every read below is RLS-scoped exactly like the rest of /clinician
         — if this clinician has no shared access to this patient (no
         active link, not the same clinic), these simply come back empty
         rather than erroring, and the page shows "not found" honestly
         instead of a stack trace. */
      const [{ data: profile }, { data: membership }, { data: labRows }, { data: planRows }] = await Promise.all([
        supabase.from("profiles").select("full_name, lang").eq("id", id).maybeSingle(),
        supabase.from("clinic_members").select("clinics(name)").eq("clinician_id", user.id).maybeSingle(),
        supabase.from("lab_values").select("id, marker, value, unit, taken_on").eq("patient_id", id).order("taken_on", { ascending: false }),
        supabase.from("care_plans").select("id, status, plan_json, approved_at, approved_by_reg_number").eq("patient_id", id).eq("status", "approved").order("approved_at", { ascending: false }),
      ]);

      if (cancelled) return;
      if (!profile) {
        setError("Could not read that patient's record — check they're still linked to you.");
        setLoading(false);
        return;
      }

      setPatientName(profile.full_name ?? "Patient");
      setLang(profile.lang === "hi" ? "hi" : "en");
      setClinicName((membership?.clinics as unknown as { name: string } | null)?.name ?? null);
      setLabs(labRows ?? []);
      setPlans(planRows ?? []);
      setLoading(false);

      fetch("/api/clinician/audit/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: id }),
      }).catch(() => {});
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <div className="p-8 text-sm text-gray-500">Loading…</div>;
  }
  if (error || !patientId) {
    return <div className="p-8 text-sm text-red-600">{error ?? "Patient not found."}</div>;
  }

  return (
    <div className="mx-auto max-w-3xl p-8 print:p-0" style={{ color: "#111", background: "#fff" }} lang={lang}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff; }
        }
      `}</style>

      <div className="no-print mb-6 flex justify-end">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white"
        >
          <Printer className="h-4 w-4" /> {t("print")}
        </button>
      </div>

      <header className="mb-8 border-b border-gray-300 pb-4">
        {clinicName && <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">{clinicName}</p>}
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-lg">{patientName}</p>
        <p className="text-sm text-gray-500">{t("exported")} {new Date().toLocaleDateString()}</p>
      </header>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">{t("labHistory")}</h2>
        {labs.length === 0 ? (
          <p className="text-sm text-gray-500">{t("noLabs")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300 text-left">
                <th className="py-1 pr-4">{t("marker")}</th>
                <th className="py-1 pr-4">{t("value")}</th>
                <th className="py-1">{t("date")}</th>
              </tr>
            </thead>
            <tbody>
              {labs.map((l) => (
                <tr key={l.id} className="border-b border-gray-100">
                  <td className="py-1 pr-4">{MARKER_LABEL[l.marker] ?? l.marker}</td>
                  <td className="py-1 pr-4">{l.value} {l.unit}</td>
                  <td className="py-1">{l.taken_on}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("approvedPlans")}</h2>
        {plans.length === 0 ? (
          <p className="text-sm text-gray-500">{t("noPlans")}</p>
        ) : (
          <div className="grid gap-4">
            {plans.map((p) => (
              <div key={p.id} className="rounded border border-gray-200 p-3">
                <p className="mb-2 text-xs text-gray-500">
                  {p.approved_at && `${t("approved")} ${new Date(p.approved_at).toLocaleDateString()}`}
                  {p.approved_by_reg_number && ` · ${t("reg")} ${p.approved_by_reg_number}`}
                </p>
                <table className="w-full text-sm">
                  <tbody>
                    {p.plan_json.dishes.map((d) => (
                      <tr key={d.id}>
                        <td className="py-0.5 pr-4">{MEAL_TIME_LABEL[d.time][lang]}</td>
                        <td className="py-0.5 pr-4">{d.name[lang]}</td>
                        <td className="py-0.5 text-right">{d.kcal} kcal</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
