import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabase";

/**
 * Applies the retention windows — DPDP s.8(7).
 *
 * The Act's duty is to erase personal data once the purpose it was
 * collected for is no longer being served. Poshan had no expiry on
 * anything except family invites and clinician grants, which meant chat
 * transcripts carrying health context accumulated for the lifetime of an
 * account and nobody had decided that; it was simply what happened when
 * nothing deleted them.
 *
 * The windows themselves live in the retention_policy table, not here, so
 * that changing one is a reviewable data change rather than a deploy. This
 * route is only the trigger.
 *
 * Two ways to run it, and the database one is better:
 *
 *   pg_cron, which needs no external scheduler and cannot be reached from
 *   the internet at all —
 *     select cron.schedule('poshan-retention', '0 3 * * *',
 *                          'select public.apply_retention()');
 *
 *   or this route, called by whatever scheduler is already running the
 *   push cron, with the same Bearer-secret shape:
 *     Authorization: Bearer $PUSH_CRON_SECRET
 *
 * POST rather than GET, because it deletes things and a GET that mutates
 * will eventually be fired by a crawler, a prefetch or a link checker.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.PUSH_CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "PUSH_CRON_SECRET is not set on the server." },
      { status: 503 }
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    /* No detail on what was wrong: an unauthenticated caller learns only
       that it failed, not whether the secret was close. */
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = serviceClient();
  if (!service) {
    return NextResponse.json({ error: "Service role is not configured." }, { status: 503 });
  }

  const { data, error } = await service.rpc("apply_retention");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  /* Returns the per-table counts so a scheduler's log is a usable record
     of what was erased and when — which is the evidence s.8(7) compliance
     actually rests on. A job that deletes silently proves nothing. */
  return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), removed: data });
}
