import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { requireClinician } from "@/lib/api-auth";
import { serviceClient } from "@/lib/supabase";
import { logAudit } from "@/lib/audit-log";

const INVITE_TTL_MS = 24 * 60 * 60 * 1000;
/* Short enough to read aloud or copy off a slip of paper. Collisions are
   caught by the unique constraint on patient_links.invite_code and simply
   retried, so 8 chars (36^8 space) is generous, not tight. */
function generateInviteCode() {
  return randomBytes(6).toString("base64url").toUpperCase().slice(0, 8);
}

/**
 * No .eq("clinician_id", user.id) filter here on purpose. RLS already
 * scopes this correctly on its own — a solo Practitioner clinician's own
 * "linked clinician reads own links" policy, or (for a Clinic-tier member)
 * the additive "clinic member reads clinic's patient links" policy from
 * the clinic-teams migration — and adding an app-level filter on top would
 * silently re-narrow a Clinic member back down to just their own patients,
 * defeating the shared list the migration exists to enable. Let RLS be the
 * one place this is decided.
 */
export async function GET(request: NextRequest) {
  const auth = await requireClinician(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("patient_links")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await logAudit({ actorId: user.id, action: "read_patient_list" });
  return NextResponse.json(data);
}

/**
 * Generates an invite. Writes via the service role because patient_links
 * has no client insert policy at all — the patient's own redeem action is
 * the only thing allowed to create the accepted side of a link, and even
 * the clinician's invite has to go through a server route rather than a
 * direct client insert so expiry/single-use logic lives in one place.
 */
export async function POST(request: NextRequest) {
  const auth = await requireClinician(request);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const service = serviceClient();
  if (!service) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  let code = generateInviteCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await service
      .from("patient_links")
      .insert({
        clinician_id: user.id,
        invited_by: user.id,
        status: "pending",
        invite_code: code,
        invite_expires_at: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
      })
      .select()
      .single();

    if (!error) return NextResponse.json(data);
    if (error.code !== "23505") return NextResponse.json({ error: error.message }, { status: 400 });
    code = generateInviteCode(); // code collision — regenerate and retry
  }

  return NextResponse.json({ error: "Could not generate a unique invite code." }, { status: 500 });
}
