import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";
import { PROCESSORS, NOTICE_VERSION } from "@/lib/dpdp";

/**
 * The right to know — DPDP s.11.
 *
 * s.11(1)(a) entitles a Data Principal to a summary of the personal data
 * being processed and the processing activities; s.11(1)(b) to the
 * identities of every other Fiduciary and Processor it has been shared
 * with, and what was shared. The Privacy Centre already answered a
 * narrower question — which *clinicians* opened something — but never
 * showed the person their own data, and never named Supabase, Anthropic,
 * OpenAI, Razorpay or Resend to them anywhere outside the policy prose.
 *
 * Returns everything as one JSON document rather than a paginated view,
 * because the purpose is portability and inspection, not browsing. The
 * Data Principal should be able to save this file, open it, and find their
 * whole record in it.
 *
 * Runs entirely on the caller's own authenticated client. That is not an
 * implementation detail — it means RLS is what decides what comes back, so
 * this route cannot over-disclose even if the table list below is wrong.
 * A bug here can only ever return *less* than it should.
 */

/**
 * Every table holding this person's data, and the column that ties it to
 * them. Three different names for "whose row is this" is not tidiness that
 * got away — patient_id genuinely means something different from user_id
 * in the clinician tables, and flattening them would lose that.
 */
const OWNED_TABLES: { table: string; column: string }[] = [
  { table: "profiles", column: "id" },
  { table: "biomarker_readings", column: "user_id" },
  { table: "user_conditions", column: "user_id" },
  { table: "chat_messages", column: "user_id" },
  { table: "subscriptions", column: "user_id" },
  { table: "push_subscriptions", column: "user_id" },
  { table: "daily_context", column: "user_id" },
  { table: "daily_meal_logs", column: "user_id" },
  { table: "pantry_items", column: "user_id" },
  { table: "scan_corrections", column: "user_id" },
  { table: "symptom_logs", column: "user_id" },
  { table: "timeline_events", column: "user_id" },
  { table: "weight_logs", column: "user_id" },
  { table: "clinic_leads", column: "user_id" },
  { table: "checkout_orders", column: "user_id" },
  { table: "family_members", column: "account_id" },
  { table: "family_invites", column: "account_id" },
  { table: "lab_values", column: "patient_id" },
  { table: "care_plans", column: "patient_id" },
  { table: "patient_links", column: "patient_id" },
  { table: "audit_log", column: "patient_id" },
  { table: "consent_records", column: "user_id" },
  { table: "parental_consents", column: "minor_user_id" },
];

export async function GET(request: NextRequest) {
  const auth = await getAuthedSupabase(request);
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const data: Record<string, unknown> = {};
  const failed: string[] = [];

  /* Sequential rather than Promise.all: an export is a rare, deliberate
     action, and firing twenty-three concurrent queries at the connection
     pool to save a few hundred milliseconds on a once-a-year request is a
     bad trade for a database that is also serving everyone else. */
  for (const { table, column } of OWNED_TABLES) {
    const { data: rows, error } = await supabase.from(table).select("*").eq(column, user.id);
    if (error) {
      /* A table that does not exist yet — the migration has not been run —
         must not take the whole export down with it. Reported by name so
         the gap is visible in the file rather than silently absent. */
      failed.push(table);
      continue;
    }
    if (rows && rows.length > 0) data[table] = rows;
  }

  /* The payment ledger has no user_id column at all: it is keyed by
     Razorpay's identifiers, which is how a webhook arriving with no
     session can still be recorded. Reachable only by first resolving this
     user's own order and subscription ids, so it is fetched separately
     rather than being quietly missing from a document that claims to be
     complete. */
  const paymentIds = new Set<string>();
  for (const row of (data.subscriptions as Record<string, string>[] | undefined) ?? []) {
    for (const k of ["razorpay_order_id", "razorpay_payment_id", "razorpay_subscription_id"]) {
      if (row[k]) paymentIds.add(row[k]);
    }
  }
  for (const row of (data.checkout_orders as Record<string, string>[] | undefined) ?? []) {
    if (row.razorpay_subscription_id) paymentIds.add(row.razorpay_subscription_id);
    if (row.id) paymentIds.add(row.id);
  }

  return NextResponse.json(
    {
      /* ------------------------------------------------ s.11(1)(a) */
      about: {
        exportedAt: new Date().toISOString(),
        userId: user.id,
        email: user.email,
        accountCreated: user.created_at,
        noticeVersion: NOTICE_VERSION,
      },

      /* ------------------------------------------------ s.11(1)(b) */
      sharedWith: PROCESSORS.map((p) => ({
        name: p.name,
        purpose: p.does.en,
        location: p.where.en,
      })),

      /* Named rather than silently omitted: "we hold payment records you
         cannot see here" is a worse answer than a pointer to how to get
         them, and pretending they do not exist is not an option. */
      paymentRecords:
        paymentIds.size > 0
          ? {
              note:
                "Payment events are held against Razorpay's identifiers rather than your " +
                "account id, and are readable only by our servers. Ask the Grievance " +
                "Officer for these, quoting any reference below.",
              references: [...paymentIds],
            }
          : null,

      /* What could not be read, so an incomplete export says so out loud
         instead of looking complete. */
      unavailable: failed.length > 0 ? failed : undefined,

      /* ------------------------------------------------------ the data */
      data,
    },
    {
      headers: {
        /* Makes the browser save it rather than render it. The date in the
           name matters: someone comparing two exports a year apart should
           not have to open both to tell which is which. */
        "Content-Disposition": `attachment; filename="poshan-data-${new Date()
          .toISOString()
          .slice(0, 10)}.json"`,
        /* An export is a snapshot of health data. It should not sit in a
           shared cache, a proxy, or the browser's disk cache. */
        "Cache-Control": "no-store, private",
      },
    }
  );
}
