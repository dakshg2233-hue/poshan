import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getAuthedSupabase } from "@/lib/api-auth";
import { serviceClient } from "@/lib/supabase";
import { emailReady, sendGuardianConsentEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";
import { NOTICE_VERSION, isMinor } from "@/lib/dpdp";

/**
 * Verifiable parental consent — DPDP s.9(1).
 *
 * Poshan holds children's data in two shapes: a 13-to-17-year-old who
 * signed up for themselves (profiles.age has always allowed 13), and a
 * child recorded as somebody's family member (family_members.age allows 0,
 * and the migration that added it says in as many words that a family
 * member can be a child). Neither had any consent mechanism at all.
 *
 * "Verifiable" is what makes this more than a checkbox. The flow is a
 * round trip the account holder cannot complete on the guardian's behalf:
 *
 *   1. POST here with the guardian's name, relationship and email.
 *   2. A row is written with verified_at NULL — no consent yet.
 *   3. The guardian receives a link containing a single-use token.
 *   4. Following it and confirming sets verified_at. Only then may the
 *      child's data be processed.
 *
 * A token is 32 hex characters from crypto.randomBytes, which is not
 * guessable, and it expires. Both matter: an unexpiring token in an inbox
 * is a permanent open door, and a guessable one makes the whole round trip
 * theatre.
 *
 * This is the floor the Act allows, not the strongest thing possible. The
 * Rules contemplate verification against a DigiLocker credential or a
 * registered Consent Manager, and parental_consents.verification_method is
 * an enum with room for both so that adopting one later is a code change
 * rather than a migration plus a backfill.
 */

/** Long enough for a parent to read their email, short enough to matter. */
const TOKEN_HOURS = 72;

type Body = {
  familyMemberId?: unknown;
  forSelf?: unknown;
  guardianName?: unknown;
  guardianEmail?: unknown;
  guardianPhone?: unknown;
  guardianRelationship?: unknown;
  lang?: unknown;
};

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(request: NextRequest) {
  const auth = await getAuthedSupabase(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const guardianName = str(body.guardianName, 120);
  const guardianEmail = str(body.guardianEmail, 254).toLowerCase();
  const guardianRelationship = str(body.guardianRelationship, 60);
  const guardianPhone = str(body.guardianPhone, 20) || null;
  const lang = body.lang === "hi" ? "hi" : "en";

  if (!guardianName || !guardianEmail || !guardianRelationship) {
    return NextResponse.json(
      { error: "Guardian name, email and relationship are all required." },
      { status: 400 }
    );
  }
  /* Deliberately loose. Address validation by regex rejects real addresses
     far more often than it catches typos; the token round trip is what
     actually proves the address works. */
  if (!guardianEmail.includes("@") || guardianEmail.length < 5) {
    return NextResponse.json({ error: "That does not look like an email address." }, { status: 400 });
  }

  const forSelf = body.forSelf === true;
  const familyMemberId = str(body.familyMemberId, 64) || null;

  if (forSelf === Boolean(familyMemberId)) {
    return NextResponse.json(
      { error: "Name exactly one subject: either forSelf, or a familyMemberId." },
      { status: 400 }
    );
  }

  /* ------------------------------------------------- who is the child? */
  let childName = "your child";

  if (forSelf) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("date_of_birth, age, full_name")
      .eq("id", user.id)
      .maybeSingle();

    const minor = isMinor({ dateOfBirth: profile?.date_of_birth, age: profile?.age });
    if (minor === false) {
      /* Refusing this is not pedantry. A verified parental_consents row on
         an adult account would be a false record in the one table whose
         entire job is to be true. */
      return NextResponse.json(
        { error: "This account is not a minor's — parental consent does not apply." },
        { status: 409 }
      );
    }
    childName = profile?.full_name || "your child";
  } else {
    /* RLS already restricts family_members to the account holder's own
       rows, so a row coming back at all is proof of standing. */
    const { data: member } = await supabase
      .from("family_members")
      .select("id, full_name, age")
      .eq("id", familyMemberId)
      .maybeSingle();

    if (!member) return NextResponse.json({ error: "Not found." }, { status: 404 });

    if (isMinor({ age: member.age }) === false) {
      return NextResponse.json(
        { error: "That family member is an adult — parental consent does not apply." },
        { status: 409 }
      );
    }
    childName = member.full_name || "your child";
  }

  /* ------------------------------------------------------ issue a token */
  const token = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_HOURS * 3600_000).toISOString();

  const { error } = await supabase.from("parental_consents").insert({
    minor_user_id: forSelf ? user.id : null,
    family_member_id: forSelf ? null : familyMemberId,
    guardian_name: guardianName,
    guardian_email: guardianEmail,
    guardian_phone: guardianPhone,
    guardian_relationship: guardianRelationship,
    verification_method: "email_token",
    verification_token: token,
    token_expires_at: expiresAt,
    notice_version: NOTICE_VERSION,
    notice_lang: lang,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  /* -------------------------------------------------------- send it out */
  if (!emailReady()) {
    /* The row exists and is unverified, which is the safe state. Saying so
       plainly beats returning ok:true for a request that sent nothing —
       an unsent consent email is indistinguishable, from the child's side,
       from a consent that was never sought. */
    return NextResponse.json(
      {
        error:
          "The consent request was recorded but could not be emailed: no mail provider is configured.",
        pending: true,
      },
      { status: 503 }
    );
  }

  try {
    await sendGuardianConsentEmail({
      guardianEmail,
      guardianName,
      childName,
      confirmUrl: `${SITE_URL}/guardian-consent/${token}`,
      expiresHours: TOKEN_HOURS,
    });
  } catch (e) {
    /* Best effort on the cleanup: an unverified row is harmless, and a
       failed delete here should not mask the send failure. */
    const service = serviceClient();
    if (service) await service.from("parental_consents").delete().eq("verification_token", token);
    return NextResponse.json(
      { error: `Could not send the consent email: ${(e as Error).message}` },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    sentTo: guardianEmail,
    expiresAt,
    message:
      "We have emailed the guardian. Until they confirm, this child's data stays unusable.",
  });
}
