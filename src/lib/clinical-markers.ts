/**
 * The seven lab markers lab_values.marker is CHECK-constrained to
 * (supabase/migrations/20260904120000_add_clinician_platform.sql). Shared
 * between the clinician dashboard, the CSV importer and the print/export
 * view rather than three copies of the same seven rows drifting apart.
 */
export const MARKERS = [
  { key: "hba1c", label: "HbA1c", unit: "%" },
  { key: "creatinine", label: "Creatinine", unit: "mg/dL" },
  { key: "egfr", label: "eGFR", unit: "mL/min/1.73m²" },
  { key: "haemoglobin", label: "Haemoglobin", unit: "g/dL" },
  { key: "ldl", label: "LDL", unit: "mg/dL" },
  { key: "hdl", label: "HDL", unit: "mg/dL" },
  { key: "triglycerides", label: "Triglycerides", unit: "mg/dL" },
] as const;

export type MarkerKey = (typeof MARKERS)[number]["key"];

export const MARKER_LABEL: Record<string, string> = Object.fromEntries(
  MARKERS.map((m) => [m.key, m.label])
);
