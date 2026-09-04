import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";

/**
 * Weight history. profiles.weight_kg (and family_members.weight_kg) only
 * ever hold the current value — this is the trend those never had, read by
 * both the consumer Progress card and, eventually, the clinician's patient
 * view (WEIGHT-TREND gap noted against the Poshan Clinic dashboard).
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthedSupabase(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const familyMemberId = request.nextUrl.searchParams.get("family_member_id");

  let query = supabase
    .from("weight_logs")
    .select("id, weight_kg, logged_on, family_member_id")
    .eq("user_id", user.id)
    .order("logged_on", { ascending: true })
    .limit(180);

  query = familyMemberId ? query.eq("family_member_id", familyMemberId) : query.is("family_member_id", null);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const auth = await getAuthedSupabase(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const body = await request.json();
  const { weight_kg, family_member_id, logged_on } = body ?? {};

  const weight = Number(weight_kg);
  if (!Number.isFinite(weight) || weight < 20 || weight > 400) {
    return NextResponse.json({ error: "weight_kg must be between 20 and 400." }, { status: 400 });
  }

  if (family_member_id) {
    const { data: fm } = await supabase
      .from("family_members")
      .select("id")
      .eq("id", family_member_id)
      .eq("account_id", user.id)
      .maybeSingle();
    if (!fm) return NextResponse.json({ error: "Not your family member." }, { status: 403 });
  }

  const day = typeof logged_on === "string" ? logged_on : new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("weight_logs")
    .upsert(
      { user_id: user.id, family_member_id: family_member_id ?? null, weight_kg: weight, logged_on: day },
      { onConflict: "user_id,family_member_id,logged_on" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  /* Keep the "current value" columns in sync — TodayWidget's BMI and every
     other reader of profiles.weight_kg / family_members.weight_kg still
     expects a single current figure, and the most recent log is that. */
  if (family_member_id) {
    await supabase.from("family_members").update({ weight_kg: weight }).eq("id", family_member_id).eq("account_id", user.id);
  } else {
    await supabase.from("profiles").update({ weight_kg: weight }).eq("id", user.id);
  }

  return NextResponse.json(data);
}
