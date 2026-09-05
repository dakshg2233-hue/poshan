import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";

/**
 * A daily symptom journal — energy, mood, bloating, cramps, cycle day —
 * the signal biomarkers alone don't carry, mainly for PCOS but not gated
 * to it: anyone can log, the UI just surfaces the card more prominently
 * when 'pcos' is one of the account's recorded conditions.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthedSupabase(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("symptom_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("log_date", { ascending: false })
    .limit(60);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const auth = await getAuthedSupabase(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const body = await request.json();
  const { energy, mood, bloating, cramps, cycle_day, notes, log_date } = body ?? {};

  for (const [key, value] of [["energy", energy], ["mood", mood]] as const) {
    if (value != null && (typeof value !== "number" || value < 1 || value > 5)) {
      return NextResponse.json({ error: `${key} must be between 1 and 5.` }, { status: 400 });
    }
  }
  if (cycle_day != null && (typeof cycle_day !== "number" || cycle_day < 1 || cycle_day > 60)) {
    return NextResponse.json({ error: "cycle_day must be between 1 and 60." }, { status: 400 });
  }

  const day = typeof log_date === "string" ? log_date : new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("symptom_logs")
    .upsert(
      {
        user_id: user.id,
        log_date: day,
        energy: energy ?? null,
        mood: mood ?? null,
        bloating: !!bloating,
        cramps: !!cramps,
        cycle_day: cycle_day ?? null,
        notes: typeof notes === "string" ? notes.slice(0, 500) : null,
      },
      { onConflict: "user_id,log_date" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
