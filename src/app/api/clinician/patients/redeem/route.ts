import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";
import { serviceClient } from "@/lib/supabase";

/**
 * The patient's half of the consent flow. This is the only path by which a
 * patient_links row can move from 'pending' to 'active' — the clinician
 * that created the invite never touches this endpoint.
 *
 * The update's WHERE clause (status = 'pending' AND not expired) is what
 * makes this safe under a race: two simultaneous redeems of the same code
 * can both reach this handler, but Postgres only lets one UPDATE actually
 * match a still-'pending' row — the loser's .select() comes back empty,
 * handled below as "already used" rather than silently double-linking.
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthedSupabase(request);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const body = await request.json();
  const code = typeof body?.invite_code === "string" ? body.invite_code.trim().toUpperCase() : "";
  if (!code) return NextResponse.json({ error: "An invite code is required." }, { status: 400 });

  const service = serviceClient();
  if (!service) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const { data: existing } = await service
    .from("patient_links")
    .select("id, clinician_id, status, invite_expires_at")
    .eq("invite_code", code)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "That invite code wasn't found." }, { status: 404 });
  }
  if (existing.status !== "pending") {
    return NextResponse.json({ error: "That invite code has already been used." }, { status: 409 });
  }
  if (existing.invite_expires_at && new Date(existing.invite_expires_at) < new Date()) {
    return NextResponse.json({ error: "That invite code has expired." }, { status: 410 });
  }

  const { data, error } = await service
    .from("patient_links")
    .update({
      patient_id: user.id,
      status: "active",
      linked_at: new Date().toISOString(),
      invite_code: null, // burn the code so it can't be redeemed again
    })
    .eq("id", existing.id)
    .eq("status", "pending") // the race guard described above
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) {
    return NextResponse.json({ error: "That invite code has already been used." }, { status: 409 });
  }

  return NextResponse.json(data);
}
