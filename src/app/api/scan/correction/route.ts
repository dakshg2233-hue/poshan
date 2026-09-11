import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";
import { MEAL_LIBRARY } from "@/lib/poshan-data";

/**
 * Records what the user changed after a scan.
 *
 * This is the most valuable data Poshan collects and it costs a user
 * nothing to produce: they were going to fix the wrong portion anyway.
 * Every row is a human-labelled example of a real Indian meal, photographed
 * in a real kitchen, at a real portion — the exact thing no public dataset
 * has and no competitor can buy.
 *
 * Written from the first scan even though nothing reads it yet. It cannot
 * be backfilled: a correction not captured at the moment it happened is
 * gone. A year of these is worth more than any model choice made today.
 *
 * 'confirmed' rows matter as much as the corrections. A training set built
 * only from mistakes teaches a model that it is always wrong; the cases it
 * got right are what calibrate it.
 */

type CorrectionBody = {
  corrections?: {
    kind?: string;
    predictedDishId?: string | null;
    predictedQty?: number | null;
    predictedConfidence?: string | null;
    actualDishId?: string | null;
    actualQty?: number | null;
  }[];
};

const KINDS = new Set(["removed", "added", "requantified", "confirmed"]);
const CONFIDENCES = new Set(["high", "medium", "low"]);

export async function POST(request: NextRequest) {
  const auth = await getAuthedSupabase(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: CorrectionBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const list = body.corrections;
  if (!Array.isArray(list) || list.length === 0) {
    return NextResponse.json({ error: "No corrections supplied." }, { status: 400 });
  }
  /* One scan cannot plausibly produce more than a handful of corrections;
     a larger batch is either a bug or someone padding the table. */
  if (list.length > 24) {
    return NextResponse.json({ error: "Too many corrections in one request." }, { status: 400 });
  }

  const known = new Set(MEAL_LIBRARY.map((m) => m.id));

  const rows = list
    .filter((c) => typeof c.kind === "string" && KINDS.has(c.kind))
    .map((c) => ({
      user_id: user.id,
      kind: c.kind as string,
      /* Dish ids are validated against the library rather than stored as
         given: an unrecognised id in a training set is a row that can
         never be joined back to anything. */
      predicted_dish_id:
        c.predictedDishId && known.has(c.predictedDishId) ? c.predictedDishId : null,
      predicted_qty: typeof c.predictedQty === "number" ? c.predictedQty : null,
      predicted_conf:
        c.predictedConfidence && CONFIDENCES.has(c.predictedConfidence)
          ? c.predictedConfidence
          : null,
      actual_dish_id: c.actualDishId && known.has(c.actualDishId) ? c.actualDishId : null,
      actual_qty: typeof c.actualQty === "number" ? c.actualQty : null,
    }));

  if (rows.length === 0) {
    return NextResponse.json({ error: "No valid corrections supplied." }, { status: 400 });
  }

  const { error } = await supabase.from("scan_corrections").insert(rows);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, recorded: rows.length });
}
