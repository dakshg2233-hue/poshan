import { NextRequest, NextResponse } from "next/server";
import { requireClinician } from "@/lib/api-auth";

const MARKERS = ["hba1c", "creatinine", "egfr", "haemoglobin", "ldl", "hdl", "triglycerides"] as const;
const MAX_ROWS = 500;

interface Row {
  marker: string;
  value: number;
  unit: string;
  taken_on: string;
}

/**
 * "CSV bulk upload of lab results" (CLINIC_TIERS). Takes already-parsed
 * rows, not a raw CSV file — parsing happens client-side (a four-column
 * marker,value,unit,taken_on format needs nothing more than String.split,
 * so no CSV library either side) and this endpoint's job is purely the
 * validate-then-insert step, reusing the exact same RLS-backed insert path
 * /api/clinician/labs already uses per row.
 */
export async function POST(request: NextRequest) {
  const auth = await requireClinician(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const body = await request.json();
  const patientId = typeof body?.patient_id === "string" ? body.patient_id : null;
  const rows: unknown = body?.rows;
  if (!patientId || !Array.isArray(rows)) {
    return NextResponse.json({ error: "patient_id and rows are required." }, { status: 400 });
  }
  if (rows.length === 0) return NextResponse.json({ error: "No rows to import." }, { status: 400 });
  if (rows.length > MAX_ROWS) {
    return NextResponse.json({ error: `A single import is capped at ${MAX_ROWS} rows.` }, { status: 400 });
  }

  const valid: Row[] = [];
  const rejected: { row: number; reason: string }[] = [];

  rows.forEach((raw, i) => {
    const r = raw as Partial<Row>;
    if (typeof r.marker !== "string" || !(MARKERS as readonly string[]).includes(r.marker)) {
      rejected.push({ row: i + 1, reason: `Unknown marker "${r.marker}"` });
      return;
    }
    if (typeof r.value !== "number" || !Number.isFinite(r.value)) {
      rejected.push({ row: i + 1, reason: "Value is not a number" });
      return;
    }
    if (typeof r.unit !== "string" || !r.unit.trim()) {
      rejected.push({ row: i + 1, reason: "Missing unit" });
      return;
    }
    if (typeof r.taken_on !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(r.taken_on)) {
      rejected.push({ row: i + 1, reason: "Date must be YYYY-MM-DD" });
      return;
    }
    valid.push({ marker: r.marker, value: r.value, unit: r.unit, taken_on: r.taken_on });
  });

  if (valid.length === 0) {
    return NextResponse.json({ error: "No valid rows found.", rejected }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("lab_values")
    .insert(valid.map((r) => ({ ...r, patient_id: patientId, entered_by: user.id })))
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ inserted: data.length, rejected });
}
