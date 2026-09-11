import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";
import { backfillTimeline, recordTimelineEvent, type TimelineKind } from "@/lib/timeline";

/**
 * The patient's own health timeline.
 *
 * Backfills before reading, every time. That looks wasteful and isn't: the
 * upserts are idempotent on (user_id, source_table, source_id), so a second
 * read writes nothing, and it means the timeline is never stale with
 * respect to labs or weights recorded through paths that predate this
 * feature. The alternative — writing a timeline row at every call site
 * that touches lab_values, weight_logs and care_plans — is six places to
 * keep in sync, and the one that gets forgotten is a hole in a history the
 * user believes is complete.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthedSupabase(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  await backfillTimeline(user.id);

  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? 100), 300);
  const before = request.nextUrl.searchParams.get("before");

  let query = supabase
    .from("timeline_events")
    .select("id, kind, title, detail, occurred_on, source_table, source_id")
    .eq("user_id", user.id)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) query = query.lt("occurred_on", before);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ events: data ?? [] });
}

/**
 * Adds an event the user recorded themselves — a consultation they had
 * elsewhere, a run, a medication change. Restricted to the kinds a person
 * can legitimately assert about their own life: 'lab' and 'plan' are
 * excluded because those must come from lab_values and care_plans, where a
 * clinician's sign-off lives. A self-reported lab value that renders
 * identically to a verified one is the kind of thing a doctor would later
 * act on without knowing which it was.
 */
const SELF_REPORTABLE = new Set<TimelineKind>(["consultation", "symptom", "weight", "condition"]);

export async function POST(request: NextRequest) {
  const auth = await getAuthedSupabase(request);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  let body: { kind?: string; title?: string; occurredOn?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const kind = body.kind as TimelineKind | undefined;
  if (!kind || !SELF_REPORTABLE.has(kind)) {
    return NextResponse.json(
      { error: "That kind of event can't be added by hand." },
      { status: 400 }
    );
  }

  const title = (body.title ?? "").trim();
  if (!title || title.length > 140) {
    return NextResponse.json({ error: "A title of up to 140 characters is required." }, { status: 400 });
  }

  const occurredOn = body.occurredOn ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }
  /* A timeline is a record of what happened, so it cannot contain the
     future. Guards against a mistyped year burying every real entry. */
  if (occurredOn > new Date().toISOString().slice(0, 10)) {
    return NextResponse.json({ error: "That date is in the future." }, { status: 400 });
  }

  await recordTimelineEvent({
    userId: user.id,
    kind,
    title,
    occurredOn,
    detail: { self_reported: true },
  });

  return NextResponse.json({ ok: true });
}
