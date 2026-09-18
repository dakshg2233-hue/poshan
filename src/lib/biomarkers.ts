/**
 * The biomarkers a person tracks themselves, and who may track which.
 *
 * Distinct from MARKERS in clinical-markers.ts. Those seven are the
 * clinician platform's lab panel, CHECK-constrained on lab_values and
 * entered by a practitioner from a report. These four are the consumer
 * side: tests an ordinary person in India actually gets done, gets a
 * number back for, and can move with food.
 *
 * The pricing page has been selling this split the whole time — "Log and
 * track 2 biomarkers by hand: Vitamin D and HbA1c" on free, "track all 4
 * biomarkers" on Home — and none of it existed. There was no list, no
 * count of four, no Vitamin D anywhere in the codebase, and no gate: a
 * free account could log anything it liked, and biomarker_readings.marker
 * is plain `text` with no constraint, so it would have stored any string
 * at all.
 *
 * So the list below is built to match what was promised rather than the
 * promise being quietly walked back. Four markers, the first two free.
 *
 * Why these four: HbA1c and Vitamin D because they are what the page
 * already named; haemoglobin because anaemia is the most common deficiency
 * in India by a wide margin, and it responds to diet; LDL because it is
 * the lipid number people are given a target for and told to eat around.
 */

export const BIOMARKERS = [
  { key: "vitamin_d", label: "Vitamin D", unit: "ng/mL", free: true },
  { key: "hba1c", label: "HbA1c", unit: "%", free: true },
  { key: "haemoglobin", label: "Haemoglobin", unit: "g/dL", free: false },
  { key: "ldl", label: "LDL", unit: "mg/dL", free: false },
] as const;

export type BiomarkerKey = (typeof BIOMARKERS)[number]["key"];

export const FREE_BIOMARKERS = BIOMARKERS.filter((m) => m.free).map((m) => m.key);

export function isBiomarkerKey(value: unknown): value is BiomarkerKey {
  return typeof value === "string" && BIOMARKERS.some((m) => m.key === value);
}

/** Free accounts get the two the pricing page names; subscribers get all four. */
export function canLogBiomarker(marker: BiomarkerKey, isPremium: boolean): boolean {
  if (isPremium) return true;
  return (FREE_BIOMARKERS as readonly string[]).includes(marker);
}

/**
 * Plausible ranges, used only to reject a typo before it becomes a data
 * point — 700 for a Vitamin D reading is a slipped decimal, not a result.
 * These are deliberately wide: they are not reference ranges and say
 * nothing about whether a value is healthy. Poshan does not diagnose.
 */
const PLAUSIBLE: Record<BiomarkerKey, { min: number; max: number }> = {
  vitamin_d: { min: 1, max: 200 },
  hba1c: { min: 2, max: 20 },
  haemoglobin: { min: 2, max: 25 },
  ldl: { min: 10, max: 400 },
};

export function isPlausibleValue(marker: BiomarkerKey, value: number): boolean {
  const r = PLAUSIBLE[marker];
  return Number.isFinite(value) && value >= r.min && value <= r.max;
}

export const BIOMARKER_LABEL: Record<string, string> = Object.fromEntries(
  BIOMARKERS.map((m) => [m.key, m.label])
);

export const BIOMARKER_UNIT: Record<string, string> = Object.fromEntries(
  BIOMARKERS.map((m) => [m.key, m.unit])
);
