import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase";
import { isValidConsentToken, tokenState } from "@/lib/dpdp-rules";

/**
 * The guardian's half of the s.9(1) round trip.
 *
 * Runs on the service role, unauthenticated, and that combination is the
 * whole point: the guardian almost certainly has no Poshan account, and
 * requiring them to make one to refuse permission would be an obstacle
 * placed in front of a protection. Possession of the token is the
 * authorisation, which is why the token is 128 bits of randomness with an
 * expiry rather than something derivable from the child's details.
 *
 * GET describes the request without changing anything, so the page the
 * guardian lands on can say who is asking and about whom before they
 * decide. POST is the decision.
 *
 * Note what this route will not do: it cannot be used to *discover*
 * anything. An unknown, expired or already-used token gets the same shape
 * of answer as a wrong one, so the endpoint is not an oracle for guessing
 * tokens or enumerating children.
 */

type Ctx = { params: Promise<{ token: string }> };

async function loadConsent(token: string) {
  /* Shape-checked before it ever reaches a query, so a malformed token
     costs the same as a wrong one and tells the caller the same thing.
     Both this and the state machine below live in dpdp-rules, where they
     are tested directly rather than only through HTTP. */
  if (!isValidConsentToken(token)) return { error: "invalid" as const };

  const service = serviceClient();
  if (!service) return { error: "unconfigured" as const };

  const { data: row } = await service
    .from("parental_consents")
    /* One string literal, not a concatenation: the Supabase client infers
       the row type from the select text at compile time, and an expression
       it cannot read statically collapses the whole row to an error type. */
    .select(
      "id, guardian_name, guardian_relationship, minor_user_id, family_member_id, verified_at, revoked_at, token_expires_at, notice_lang"
    )
    .eq("verification_token", token)
    .maybeSingle();

  if (!row) return { error: "invalid" as const };

  const state = tokenState(row);
  if (state === "revoked") return { error: "revoked" as const };
  if (state === "expired") return { error: "expired" as const };

  return { row, service };
}

/** Whose data this is about, resolved for display only. */
async function childName(
  service: NonNullable<ReturnType<typeof serviceClient>>,
  row: { minor_user_id: string | null; family_member_id: string | null }
): Promise<string> {
  if (row.family_member_id) {
    const { data } = await service
      .from("family_members")
      .select("full_name")
      .eq("id", row.family_member_id)
      .maybeSingle();
    return data?.full_name ?? "a child";
  }
  if (row.minor_user_id) {
    const { data } = await service
      .from("profiles")
      .select("full_name")
      .eq("id", row.minor_user_id)
      .maybeSingle();
    return data?.full_name ?? "a child";
  }
  return "a child";
}

export async function GET(_request: NextRequest, ctx: Ctx) {
  const { token } = await ctx.params;
  const result = await loadConsent(token);

  if ("error" in result) {
    return NextResponse.json({ status: result.error }, { status: result.error === "unconfigured" ? 500 : 404 });
  }

  const { row, service } = result;

  return NextResponse.json({
    status: row.verified_at ? "already_confirmed" : "pending",
    guardianName: row.guardian_name,
    relationship: row.guardian_relationship,
    childName: await childName(service, row),
    lang: row.notice_lang,
    expiresAt: row.token_expires_at,
  });
}

export async function POST(request: NextRequest, ctx: Ctx) {
  const { token } = await ctx.params;

  let body: { decision?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    /* Falls through to the validation below. */
  }

  const decision = body.decision;
  if (decision !== "grant" && decision !== "refuse") {
    return NextResponse.json(
      { error: "decision must be 'grant' or 'refuse'." },
      { status: 400 }
    );
  }

  const result = await loadConsent(token);
  if ("error" in result) {
    return NextResponse.json({ status: result.error }, { status: result.error === "unconfigured" ? 500 : 404 });
  }

  const { row, service } = result;

  if (row.verified_at) {
    return NextResponse.json({ status: "already_confirmed" });
  }

  if (decision === "refuse") {
    /* A refusal is recorded, not discarded. It is the difference between
       "the guardian said no" and "the guardian never replied", and only
       one of those should ever be asked again. The token is cleared so the
       link in the inbox stops working the moment it is used. */
    const { error } = await service
      .from("parental_consents")
      .update({ revoked_at: new Date().toISOString(), verification_token: null })
      .eq("id", row.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ status: "refused" });
  }

  /* Single-use: the token is cleared in the same statement that records
     the consent, so a forwarded or re-opened link cannot re-grant
     something the guardian later withdraws. */
  const { error } = await service
    .from("parental_consents")
    .update({ verified_at: new Date().toISOString(), verification_token: null })
    .eq("id", row.id)
    .is("verified_at", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ status: "confirmed" });
}
