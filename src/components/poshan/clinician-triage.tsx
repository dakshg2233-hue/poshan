"use client";

import { useCallback, useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { BAND_COLOR, BAND_LABEL, type TriageBand, type TriageSignal } from "@/lib/triage";

/**
 * The clinician's triage list — the screen that replaces reading 300
 * WhatsApp messages.
 *
 * The organising idea is triage by exception. A doctor with 342 patients
 * does not want a dashboard of 342 rows; they want the twelve that changed
 * since they last looked, in the order they should be looked at. So the
 * counts at the top are the interface, the list beneath is already sorted
 * worst-first, and every patient carries the specific reason they are in
 * the band they're in.
 *
 * Those reasons are not decoration. A ranking a clinician cannot audit is
 * a ranking they will stop trusting the first time it is wrong, so every
 * line traces to a named threshold in lib/triage.ts and reads as a fact
 * ("HbA1c 8.4% — poorly controlled"), never as advice.
 *
 * Mobile-first by construction: this is used standing up, between
 * patients, on a phone. The desktop clinician page is 1,200 lines of
 * forms; this is three taps deep at most.
 */

type TriagePatient = {
  patientId: string;
  linkId: string;
  name: string;
  adherence: number | null;
  daysSinceLastLog: number | null;
  consentOk: boolean;
  triage: { band: TriageBand; signals: TriageSignal[] };
};

type SummaryFact = {
  key: string;
  text: string;
  sources: { table: string; ids: string[] }[];
  direction?: "up" | "down" | "flat";
  severity?: "info" | "watch" | "urgent";
};

export function ClinicianTriage() {
  const [patients, setPatients] = useState<TriagePatient[]>([]);
  const [counts, setCounts] = useState({ red: 0, amber: 0, green: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [band, setBand] = useState<TriageBand | "all">("all");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/clinician/triage")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Could not load.");
        return r.json();
      })
      .then((d) => {
        if (cancelled) return;
        setPatients(d.patients ?? []);
        setCounts(d.counts ?? { red: 0, amber: 0, green: 0 });
        /* Band counts only. A clinician's caseload size is a business
           metric; which patients are in which band is clinical data and
           has no business leaving this screen. */
        const c = d.counts ?? { red: 0, amber: 0, green: 0 };
        track("triage_opened", { red: c.red, amber: c.amber, green: c.green });
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="py-8 text-center text-sm text-[var(--ink-soft)]">Loading your patients…</p>;
  }
  if (error) {
    return <p className="py-8 text-center text-sm text-[var(--ink-soft)]">{error}</p>;
  }

  const shown = band === "all" ? patients : patients.filter((p) => p.triage.band === band);

  return (
    <section className="w-full">
      <header className="mb-5">
        <h2 className="text-[1.5rem]" style={{ fontFamily: "var(--font-display)" }}>
          Your patients
        </h2>
        <p className="text-[0.86rem]" style={{ color: "var(--ink-soft)" }}>
          {patients.length} active · sorted by what needs looking at first
        </p>
      </header>

      {/* The counts ARE the navigation — tapping one filters the list. */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {(["red", "amber", "green"] as const).map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => setBand(band === b ? "all" : b)}
            aria-pressed={band === b}
            className="rounded-2xl px-3 py-4 text-left transition-all"
            style={{
              background: band === b ? BAND_COLOR[b] : "var(--roti-2)",
              color: band === b ? "#fff" : "inherit",
              border: `1px solid ${band === b ? BAND_COLOR[b] : "var(--line, rgba(0,0,0,0.10))"}`,
            }}
          >
            <div
              className="text-[1.8rem] leading-none tabular-nums"
              style={{ fontFamily: "var(--font-data)", color: band === b ? "#fff" : BAND_COLOR[b] }}
            >
              {counts[b]}
            </div>
            <div className="text-[0.76rem] mt-1.5 leading-tight">{BAND_LABEL[b].en}</div>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p
          className="rounded-xl p-5 text-center text-[0.9rem]"
          style={{ background: "var(--roti-2)", color: "var(--ink-soft)" }}
        >
          {patients.length === 0
            ? "No patients have linked their account to you yet."
            : "Nobody in this band right now."}
        </p>
      ) : (
        <ul className="list-none p-0 m-0 grid gap-2">
          {shown.map((p) => (
            <li key={p.linkId}>
              <PatientRow
                patient={p}
                expanded={open === p.patientId}
                onToggle={() => setOpen(open === p.patientId ? null : p.patientId)}
              />
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-[0.78rem] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
        These bands rank who to review first. They are not a diagnosis or a severity score, and
        every reason shown traces to a published threshold — ADA/ICMR for HbA1c, KDIGO for eGFR,
        WHO for haemoglobin. Your clinical judgement decides what any of it means.
      </p>
    </section>
  );
}

function PatientRow({
  patient,
  expanded,
  onToggle,
}: {
  patient: TriagePatient;
  expanded: boolean;
  onToggle: () => void;
}) {
  const color = BAND_COLOR[patient.triage.band];

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: "var(--roti-2)", borderLeft: `4px solid ${color}` }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full text-left px-4 py-3.5"
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[1rem] font-medium truncate">{patient.name}</span>
          {patient.adherence !== null && (
            <span
              className="text-[0.82rem] tabular-nums shrink-0"
              style={{ fontFamily: "var(--font-data)", color: "var(--ink-soft)" }}
            >
              {Math.round(patient.adherence * 100)}%
            </span>
          )}
        </div>

        {patient.triage.signals.length > 0 ? (
          <p className="text-[0.85rem] mt-1" style={{ color }}>
            {patient.triage.signals[0].text}
            {patient.triage.signals.length > 1 && (
              <span style={{ color: "var(--ink-soft)" }}>
                {" "}
                +{patient.triage.signals.length - 1} more
              </span>
            )}
          </p>
        ) : (
          <p className="text-[0.85rem] mt-1" style={{ color: "var(--ink-soft)" }}>
            Nothing flagged
          </p>
        )}

        {!patient.consentOk && (
          /* An active link whose consent has lapsed or was never scoped to
             clinical data. Said plainly: a doctor seeing "nothing flagged"
             must know whether that means "all clear" or "I can't see". */
          <p className="text-[0.78rem] mt-1" style={{ color: "var(--ink-soft)" }}>
            This patient hasn&apos;t shared clinical data with you
          </p>
        )}
      </button>

      {expanded && <PatientDetail patient={patient} />}
    </div>
  );
}

function PatientDetail({ patient }: { patient: TriagePatient }) {
  const [facts, setFacts] = useState<SummaryFact[] | null>(null);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [withheld, setWithheld] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(
        `/api/clinician/patients/summary?patient_id=${encodeURIComponent(patient.patientId)}`
      );
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Could not load the summary.");
      setFacts(d.facts ?? []);
      setNarrative(d.narrative ?? null);
      setWithheld(d.withheldScopes ?? []);
      /* Counts, never content. `withheld` is the interesting one: it says
         how often consent scoping actually bites in practice. */
      track("patient_summary_read", {
        facts: (d.facts ?? []).length,
        withheld: (d.withheldScopes ?? []).length,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the summary.");
    } finally {
      setLoading(false);
    }
  }, [patient.patientId]);

  return (
    <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: "var(--line, rgba(0,0,0,0.08))" }}>
      {patient.triage.signals.length > 1 && (
        <ul className="list-none p-0 m-0 grid gap-1 mb-3 mt-3">
          {patient.triage.signals.slice(1).map((s, i) => (
            <li key={i} className="text-[0.85rem]" style={{ color: BAND_COLOR[s.band] }}>
              {s.text}
            </li>
          ))}
        </ul>
      )}

      {!facts && !loading && (
        <button
          type="button"
          onClick={loadSummary}
          className="rounded-full px-4 py-2 text-[0.85rem] font-semibold mt-2"
          style={{ background: "var(--kesar)", color: "var(--roti)" }}
        >
          Review last 30 days
        </button>
      )}

      {loading && (
        <p className="text-[0.85rem] mt-3" style={{ color: "var(--ink-soft)" }}>
          Reading their records…
        </p>
      )}
      {error && (
        <p className="text-[0.85rem] mt-3" style={{ color: "#C0392B" }}>
          {error}
        </p>
      )}

      {facts && (
        <div className="mt-3 grid gap-3">
          {narrative && (
            <p
              className="text-[0.9rem] leading-relaxed rounded-xl p-3"
              style={{ background: "var(--roti)" }}
            >
              {narrative}
            </p>
          )}

          {/* The facts are the product; the paragraph above is a
              convenience over them. Every line here was computed from a
              specific row, which is why it can be shown even when no
              model is configured. */}
          <ul className="list-none p-0 m-0 grid gap-1.5">
            {facts.map((f) => (
              <li key={f.key} className="text-[0.86rem] flex gap-2">
                <span
                  aria-hidden
                  className="shrink-0"
                  style={{
                    color:
                      f.severity === "urgent"
                        ? BAND_COLOR.red
                        : f.severity === "watch"
                          ? BAND_COLOR.amber
                          : "var(--ink-soft)",
                  }}
                >
                  •
                </span>
                <span>{f.text}</span>
              </li>
            ))}
          </ul>

          {withheld.length > 0 && (
            <p className="text-[0.78rem]" style={{ color: "var(--ink-soft)" }}>
              Not shared with you: {withheld.join(", ")}. This summary does not cover those.
            </p>
          )}

          {narrative && (
            <p className="text-[0.74rem]" style={{ color: "var(--ink-soft)" }}>
              The paragraph is AI-written from the bulleted facts only — it cannot introduce a
              number that isn&apos;t above. Check the bullets, not the prose.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
