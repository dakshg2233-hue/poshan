import { type MarkerKey } from "./clinical-markers";
import { dayOf } from "@/lib/day";

/**
 * The triage engine behind the clinician dashboard's 🔴 / 🟠 / 🟢 buckets.
 *
 * A doctor with 342 patients does not read 342 charts. They read the ones
 * that changed. This module decides which those are, and — as important —
 * says why in a sentence the doctor can check against the data themselves.
 *
 * Rule-based and fully deterministic, for the same reason daily-engine.ts
 * is: this drives what a clinician looks at first, and a ranking that
 * cannot be explained is a ranking that cannot be trusted or corrected.
 * Every band a patient lands in traces to a named threshold below, and
 * every threshold cites the guideline it came from.
 *
 * This is emphatically NOT a diagnosis or a severity score. It answers one
 * operational question — "who should this clinician look at first today?"
 * — and the copy in the UI says exactly that.
 */

export type TriageBand = "red" | "amber" | "green";

export type TriageSignal = {
  band: TriageBand;
  /** Shown verbatim under the patient's name on the list. */
  text: string;
  /** Which fact produced it, so the doctor can go check the source. */
  source: "lab" | "adherence" | "plan" | "inactivity";
};

export type TriageInput = {
  /** Most recent value per marker, plus the one before it if there is one. */
  labs: { marker: MarkerKey; value: number; taken_on: string }[];
  /** 0–1. Share of recommended meals actually logged over the window. */
  adherence: number | null;
  /** Days since the patient last logged anything at all. */
  daysSinceLastLog: number | null;
  /** An approved plan exists that the patient has never opened. */
  planUnopened: boolean;
  /** Days since the current plan was approved. */
  daysSincePlanApproved: number | null;
};

export type TriageResult = {
  band: TriageBand;
  signals: TriageSignal[];
};

/* ------------------------------------------------------------ thresholds
   Values sourced to published guidance, not chosen for the demo:

   - HbA1c ≥ 6.5% is the ADA/ICMR diabetes diagnostic threshold; 5.7–6.4%
     is the prediabetes band. ≥ 8.0% is poor control by ICMR's own
     management guidance, which is the level that warrants a look now.
   - eGFR < 30 is KDIGO stage G4 — a nephrology-referral number, and the
     point at which several dietary constraints become hard limits.
   - Haemoglobin < 8 g/dL is severe anaemia per WHO; < 11 is anaemia in
     non-pregnant adult women, < 13 in men. The single 8.0 line here is
     the "look now" one, deliberately sex-neutral because lab_values does
     not carry sex and inventing one would be worse than a coarser rule.
   - LDL ≥ 190 mg/dL is the severe-hypercholesterolaemia threshold at
     which guidelines stop recommending diet-first management alone.

   A value crossing one of these is a reason to LOOK, not a finding. The
   distinction is the whole design of this file. */
const RED_LAB: Partial<Record<MarkerKey, (v: number) => string | null>> = {
  hba1c: (v) => (v >= 8.0 ? `HbA1c ${v}% — poorly controlled` : null),
  egfr: (v) => (v < 30 ? `eGFR ${v} — stage G4 or worse` : null),
  haemoglobin: (v) => (v < 8 ? `Haemoglobin ${v} g/dL — severe anaemia` : null),
  ldl: (v) => (v >= 190 ? `LDL ${v} mg/dL — severe elevation` : null),
};

const AMBER_LAB: Partial<Record<MarkerKey, (v: number) => string | null>> = {
  hba1c: (v) => (v >= 6.5 ? `HbA1c ${v}% — above diabetic threshold` : v >= 5.7 ? `HbA1c ${v}% — prediabetic range` : null),
  egfr: (v) => (v < 60 ? `eGFR ${v} — reduced function` : null),
  haemoglobin: (v) => (v < 11 ? `Haemoglobin ${v} g/dL — anaemic range` : null),
  ldl: (v) => (v >= 160 ? `LDL ${v} mg/dL — high` : null),
  triglycerides: (v) => (v >= 200 ? `Triglycerides ${v} mg/dL — high` : null),
};

/** Below this, following the plan isn't really happening. */
const ADHERENCE_RED = 0.3;
const ADHERENCE_AMBER = 0.6;

/** A patient who has logged nothing for this long has effectively left. */
const SILENT_DAYS_RED = 21;
const SILENT_DAYS_AMBER = 10;

/** A plan approved this long ago and still never opened is a failed handoff. */
const UNOPENED_DAYS = 7;

/**
 * Latest reading per marker. lab_values holds a history; triage cares only
 * about where the patient is now, and the trend is shown on the patient's
 * own screen rather than folded into a band here.
 */
function latestPerMarker(labs: TriageInput["labs"]) {
  const byMarker = new Map<MarkerKey, { value: number; taken_on: string }>();
  for (const lab of labs) {
    const existing = byMarker.get(lab.marker);
    if (!existing || lab.taken_on > existing.taken_on) {
      byMarker.set(lab.marker, { value: lab.value, taken_on: lab.taken_on });
    }
  }
  return byMarker;
}

export function triagePatient(input: TriageInput): TriageResult {
  const signals: TriageSignal[] = [];
  const latest = latestPerMarker(input.labs);

  for (const [marker, reading] of latest) {
    const red = RED_LAB[marker]?.(reading.value);
    if (red) {
      signals.push({ band: "red", text: red, source: "lab" });
      continue;
    }
    const amber = AMBER_LAB[marker]?.(reading.value);
    if (amber) signals.push({ band: "amber", text: amber, source: "lab" });
  }

  if (input.daysSinceLastLog !== null) {
    if (input.daysSinceLastLog >= SILENT_DAYS_RED) {
      signals.push({
        band: "red",
        text: `No meals logged for ${input.daysSinceLastLog} days`,
        source: "inactivity",
      });
    } else if (input.daysSinceLastLog >= SILENT_DAYS_AMBER) {
      signals.push({
        band: "amber",
        text: `Last logged ${input.daysSinceLastLog} days ago`,
        source: "inactivity",
      });
    }
  }

  if (input.adherence !== null) {
    const pct = Math.round(input.adherence * 100);
    if (input.adherence < ADHERENCE_RED) {
      signals.push({ band: "red", text: `Following ${pct}% of the plan`, source: "adherence" });
    } else if (input.adherence < ADHERENCE_AMBER) {
      signals.push({ band: "amber", text: `Following ${pct}% of the plan`, source: "adherence" });
    }
  }

  if (
    input.planUnopened &&
    input.daysSincePlanApproved !== null &&
    input.daysSincePlanApproved >= UNOPENED_DAYS
  ) {
    signals.push({
      band: "amber",
      text: `Plan approved ${input.daysSincePlanApproved} days ago, never opened`,
      source: "plan",
    });
  }

  const band: TriageBand = signals.some((s) => s.band === "red")
    ? "red"
    : signals.some((s) => s.band === "amber")
      ? "amber"
      : "green";

  /* Red first, then amber — a doctor scanning the row wants the worst
     reason, not the first one that happened to be computed. */
  signals.sort((a, b) => (a.band === "red" ? -1 : 0) - (b.band === "red" ? -1 : 0));

  return { band, signals };
}

export const BAND_LABEL: Record<TriageBand, { en: string; hi: string }> = {
  red: { en: "Needs attention", hi: "ध्यान चाहिए" },
  amber: { en: "Worth a look", hi: "देखने लायक" },
  green: { en: "Stable", hi: "स्थिर" },
};

export const BAND_COLOR: Record<TriageBand, string> = {
  red: "#C0392B",
  amber: "#D98324",
  green: "#4A7C4E",
};

/**
 * Share of recommended meals a patient actually logged over `days`.
 *
 * Three meals a day is the denominator — the same three daily-engine.ts
 * recommends — so this measures "did you eat what was planned", not "did
 * you eat". A patient who logs two meals a day every day reads as ~67%,
 * which is the honest number: a third of the plan is not being followed,
 * whatever the reason.
 *
 * Returns null rather than 0 when the window is empty. Zero is a claim
 * ("they followed none of it"); null is the truth ("nothing to measure").
 * A doctor's list showing 0% for a patient who joined yesterday would be
 * the kind of false precision this codebase avoids elsewhere.
 */
export function computeAdherence(
  logDates: string[],
  days: number,
  joinedAt?: string | null
): number | null {
  if (days <= 0) return null;

  const windowStart = new Date(Date.now() - days * 86_400_000);
  /* A patient who joined mid-window is measured only against the days they
     were actually a patient for. */
  const effectiveStart =
    joinedAt && new Date(joinedAt) > windowStart ? new Date(joinedAt) : windowStart;
  const effectiveDays = Math.max(
    1,
    Math.round((Date.now() - effectiveStart.getTime()) / 86_400_000)
  );

  if (joinedAt && effectiveDays < 3) return null;

  const cutoff = dayOf(effectiveStart);
  const logged = logDates.filter((d) => d >= cutoff).length;

  return Math.min(1, logged / (effectiveDays * 3));
}
