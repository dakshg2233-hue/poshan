import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";

/**
 * Submits a clinician application for manual review. Does NOT create a
 * clinicians row — clinicians has no self-insert policy on purpose
 * (schema.sql), so this only records intent. Poshan reviews the
 * registration number by hand and, once satisfied, inserts the real
 * clinicians row via the service role. Same shape as clinic_leads for the
 * enterprise tiers: a form that reaches a human, not an API that grants
 * access.
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthedSupabase(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const body = await request.json();
  const { full_name, registration_number, registration_council, specialty } = body ?? {};

  if (
    typeof full_name !== "string" || !full_name.trim() ||
    typeof registration_number !== "string" || !registration_number.trim() ||
    typeof registration_council !== "string" || !registration_council.trim()
  ) {
    return NextResponse.json(
      { error: "Name, registration number and registration council are required." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("clinician_applications")
    .insert({
      user_id: user.id,
      full_name: full_name.trim(),
      registration_number: registration_number.trim(),
      registration_council: registration_council.trim(),
      specialty: typeof specialty === "string" ? specialty.trim() || null : null,
    })
    .select()
    .single();

  if (error) {
    /* unique(user_id) — a second application from the same account. */
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "You've already submitted an application." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
