import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";

/**
 * The patient revoking their own clinician's access. Uses the plain
 * authenticated client, not the service role — the "patient revokes own
 * link" RLS policy on patient_links already permits exactly this update,
 * so there's nothing here that needs bypassing RLS for. This route exists
 * only to set revoked_at alongside status, which a bare client update
 * would otherwise have to remember to do itself every time.
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthedSupabase(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const body = await request.json();
  const linkId = typeof body?.id === "string" ? body.id : null;
  if (!linkId) return NextResponse.json({ error: "A link id is required." }, { status: 400 });

  const { data, error } = await supabase
    .from("patient_links")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("id", linkId)
    .eq("patient_id", user.id)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Link not found." }, { status: 404 });
  return NextResponse.json(data);
}
