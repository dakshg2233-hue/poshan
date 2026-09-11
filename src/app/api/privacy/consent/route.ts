import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";
import { CONSENT_SCOPES, expiryFromDays, type ConsentScope } from "@/lib/consent";

/**
 * The patient changing their mind — narrowing scopes, extending or
 * shortening a grant, or revoking it outright.
 *
 * Runs on the patient's own authenticated client, not the service role, so
 * RLS is the enforcement rather than a check in this handler: the existing
 * "patient revokes own link" policy already restricts the revoke
 * transition to the row's own patient. The scope/expiry update needs a
 * policy of its own, added in the same migration as the columns.
 *
 * Deliberately no path to *widen* a grant here. Adding a scope is granting
 * new access, and new access goes through the same explicit consent
 * dialog a fresh link does — quietly extending an existing row would let
 * a UI bug turn "share my labs" into "share everything" without the
 * patient ever seeing a prompt.
 */
export async function PATCH(request: NextRequest) {
  const auth = await getAuthedSupabase(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: { id?: string; scopes?: unknown; durationDays?: unknown; revoke?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "A grant id is required." }, { status: 400 });

  const { data: link } = await supabase
    .from("patient_links")
    .select("id, patient_id, status, scopes")
    .eq("id", id)
    .maybeSingle();

  if (!link || link.patient_id !== user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (link.status !== "active") {
    return NextResponse.json({ error: "That access is no longer active." }, { status: 409 });
  }

  if (body.revoke === true) {
    const { error } = await supabase
      .from("patient_links")
      .update({ status: "revoked", revoked_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, status: "revoked" });
  }

  const update: Record<string, unknown> = {};

  if (Array.isArray(body.scopes)) {
    const current = (link.scopes ?? []) as ConsentScope[];
    const next = body.scopes.filter((s: unknown): s is ConsentScope =>
      typeof s === "string" && (CONSENT_SCOPES as readonly string[]).includes(s)
    );
    /* Narrowing only, per the doc comment: anything not already granted is
       dropped silently rather than rejected, so a client that sends the
       full list back unchanged can't accidentally widen the grant. */
    update.scopes = next.filter((s) => current.includes(s));

    if ((update.scopes as ConsentScope[]).length === 0) {
      /* Removing every scope is a revoke expressed a different way.
         Treating it as one is more honest than storing an active link
         that grants nothing. */
      const { error } = await supabase
        .from("patient_links")
        .update({ status: "revoked", revoked_at: new Date().toISOString() })
        .eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true, status: "revoked" });
    }
  }

  if (body.durationDays !== undefined) {
    const days =
      body.durationDays === null
        ? null
        : Number.isFinite(body.durationDays)
          ? Math.min(Math.max(Number(body.durationDays), 1), 365 * 2)
          : null;
    update.access_expires_at = expiryFromDays(days);
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  }

  const { error } = await supabase.from("patient_links").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, ...update });
}
