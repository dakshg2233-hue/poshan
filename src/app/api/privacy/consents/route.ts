import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getAuthedSupabase } from "@/lib/api-auth";
import {
  CONSENT_PURPOSES,
  NOTICE_VERSION,
  isConsentPurpose,
  type ConsentPurpose,
} from "@/lib/dpdp";

/**
 * The consent ledger — DPDP s.6, and the Fiduciary's burden of proving it.
 *
 * Not to be confused with /api/privacy/consent (singular), which is the
 * patient adjusting a *clinician's* access to their data. This one records
 * consent between the Data Principal and Poshan itself: the thing that,
 * before this route, existed only as a localStorage key on the user's own
 * device and therefore proved nothing to anybody.
 *
 * Three properties the Act effectively requires, and which shape this:
 *
 *   s.6(1)  Consent is a clear affirmative action for a specified purpose,
 *           so every row names one purpose. There is no "accept all".
 *   s.6(4)  Withdrawal must be as easy as giving. POST with granted:false
 *           is the same call, same shape, same cost — not a support ticket.
 *   s.6(?)  The Fiduciary must be able to show what was agreed to. Every
 *           row pins the notice version and the language it was read in,
 *           because "they consented" is not an answer without "to what".
 *
 * The table is append-only: a withdrawal inserts, never updates. The
 * current state is the most recent row per purpose, which is what GET
 * returns and what the SQL has_consent() computes for server-side gates.
 * Nothing rewrites history, and there is deliberately no policy allowing
 * it — a ledger the subject can edit is not evidence.
 */

type Body = {
  purpose?: unknown;
  granted?: unknown;
  lang?: unknown;
  anonId?: unknown;
};

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!isConsentPurpose(body.purpose)) {
    return NextResponse.json(
      { error: "Unknown purpose.", allowed: CONSENT_PURPOSES },
      { status: 400 }
    );
  }
  if (typeof body.granted !== "boolean") {
    return NextResponse.json(
      { error: "`granted` must be true or false — there is no third state." },
      { status: 400 }
    );
  }

  const lang = body.lang === "hi" ? "hi" : "en";

  /* The cookie banner is answered before anyone signs in, so this route
     has to work unauthenticated. It resolves a session if there is one and
     falls back to the caller-supplied anon id if there is not — the same
     row shape either way, so an anonymous decline is as much a record as a
     signed-in one. */
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const supabase = createServerClient(url, key, {
    cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const anonId = typeof body.anonId === "string" ? body.anonId.slice(0, 64) : null;

  if (!user && !anonId) {
    return NextResponse.json(
      { error: "Either a session or an anonymous id is required." },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("consent_records").insert({
    user_id: user?.id ?? null,
    anon_id: user ? null : anonId,
    purpose: body.purpose,
    granted: body.granted,
    notice_version: NOTICE_VERSION,
    notice_lang: lang,
    method: "explicit_click",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    ok: true,
    purpose: body.purpose,
    granted: body.granted,
    noticeVersion: NOTICE_VERSION,
  });
}

/**
 * The current state of every purpose, for rendering toggles that reflect
 * what the ledger actually says rather than what the browser remembers.
 *
 * Returns a row per purpose including ones never answered, so the caller
 * can tell "declined" from "never asked" — a distinction the UI needs and
 * that a sparse object would throw away.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthedSupabase(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data: rows, error } = await supabase
    .from("consent_records")
    .select("purpose, granted, notice_version, notice_lang, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const latest = new Map<ConsentPurpose, (typeof rows)[number]>();
  for (const r of rows ?? []) {
    /* Rows arrive newest-first, so the first sighting of a purpose is the
       live one and everything after it is history. */
    if (!latest.has(r.purpose as ConsentPurpose)) latest.set(r.purpose as ConsentPurpose, r);
  }

  return NextResponse.json({
    noticeVersion: NOTICE_VERSION,
    consents: CONSENT_PURPOSES.map((p) => {
      const row = latest.get(p);
      return {
        purpose: p,
        /* null, not false: "never asked" is not "said no", and only one of
           those should make a toggle look like the user turned it off. */
        granted: row ? row.granted : null,
        noticeVersion: row?.notice_version ?? null,
        lang: row?.notice_lang ?? null,
        at: row?.created_at ?? null,
        /* True when the words changed since they agreed — the signal that
           consent should be asked for again rather than assumed forward. */
        stale: row ? row.notice_version !== NOTICE_VERSION : false,
      };
    }),
  });
}
