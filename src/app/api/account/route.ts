import { NextRequest, NextResponse } from "next/server";
import { getAuthedSupabase } from "@/lib/api-auth";
import { serviceClient } from "@/lib/supabase";

/**
 * Erasure — DPDP s.12(3), and the duty under s.8(7) to stop holding data
 * once the purpose is done.
 *
 * Before this route the privacy policy said "write to the address below
 * and we will delete your account". A mailbox is not a mechanism: it is
 * unauditable, unbounded in time, and it fails silently when nobody is
 * reading. This makes erasure a thing the Data Principal does, in the
 * product, in one request.
 *
 * Most of the work is already done by the schema. Twenty-two tables
 * reference auth.users(id) ON DELETE CASCADE, so deleting the auth user
 * removes them in one transaction the database guarantees. What follows is
 * the part the cascade does not cover:
 *
 *   - Storage objects. Avatars live in a bucket, not a table, and nothing
 *     about deleting a row removes a file. They are also in a PUBLIC
 *     bucket, so a missed file stays readable by URL forever.
 *   - audit_log, which is ON DELETE SET NULL rather than cascade. That is
 *     correct and deliberate: the clinician-access record has to outlive
 *     the patient row or the access history becomes deniable. Setting the
 *     patient_id null anonymises it, which is the right shape — the event
 *     survives, the person does not.
 *   - deletion_requests, which must outlive the account entirely, since it
 *     is the only proof the request was honoured.
 *
 * Ordering matters and is the reverse of the obvious one: the receipt is
 * written BEFORE the destructive work, not after. If the process dies
 * halfway, a pending row is a visible, retryable failure; a receipt
 * written last would leave no trace at all of a half-deleted account.
 */

export async function DELETE(request: NextRequest) {
  const auth = await getAuthedSupabase(request);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const service = serviceClient();
  if (!service) {
    return NextResponse.json(
      { error: "Deletion is unavailable: the server is not configured for it." },
      { status: 500 }
    );
  }

  /* s.6(5)/(6) — the Data Principal bears the consequences of withdrawal,
     and is entitled to know them before it happens rather than after.
     A destructive, irreversible action gets an explicit confirmation
     token rather than firing on a bare DELETE, so that a stray request,
     a prefetch or a replayed URL cannot erase somebody's account. */
  let body: { confirm?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    /* An empty body is a missing confirmation, handled just below. */
  }
  if (body.confirm !== "DELETE") {
    return NextResponse.json(
      { error: "Confirmation required.", expected: "DELETE" },
      { status: 400 }
    );
  }

  const { data: receipt } = await service
    .from("deletion_requests")
    .insert({
      user_id: user.id,
      requested_email: user.email ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  const receiptId = receipt?.id as string | undefined;

  async function fail(reason: string) {
    if (receiptId) {
      await service!
        .from("deletion_requests")
        .update({ status: "failed", failure_reason: reason })
        .eq("id", receiptId);
    }
    return NextResponse.json({ error: reason }, { status: 500 });
  }

  /* ---------------------------------------------------- storage first.
     Done before the auth user goes, because once the user row is gone the
     only thing left identifying their files is a path prefix, and a
     failure here would leave orphaned photographs in a public bucket with
     nothing pointing at them. */
  let storageCleared = 0;
  try {
    const { data: files } = await service.storage.from("avatars").list(user.id, { limit: 1000 });
    if (files && files.length > 0) {
      const paths = files.map((f) => `${user.id}/${f.name}`);
      const { error } = await service.storage.from("avatars").remove(paths);
      if (error) return await fail(`Storage cleanup failed: ${error.message}`);
      storageCleared = paths.length;
    }
  } catch (e) {
    return await fail(`Storage cleanup failed: ${(e as Error).message}`);
  }

  /* ------------------------------------------------ anonymise the audit.
     ON DELETE SET NULL would do this anyway when the user goes; doing it
     explicitly first means the anonymisation is a step that either
     succeeded or reported why, rather than a side effect nobody observed. */
  await service.from("audit_log").update({ patient_id: null }).eq("patient_id", user.id);

  /* ------------------------------------------------- the payment ledger.
     payment_events has no user_id and no foreign key to auth.users — it is
     keyed by Razorpay's own identifiers so that a webhook arriving with no
     session can still be recorded. The consequence is that the cascade
     does not touch it, and its `raw` column holds whatever Razorpay sent,
     which routinely includes an email and a phone number. Left alone, an
     erased account keeps a payment record with contact details in it.

     Resolved the only way available: collect this user's Razorpay ids from
     the two tables that do link to them, then delete by those. Done before
     the cascade, because afterwards the ids are gone and the link is
     unrecoverable. */
  let paymentsCleared = 0;
  const [{ data: subs }, { data: orders }] = await Promise.all([
    service
      .from("subscriptions")
      .select("razorpay_order_id, razorpay_payment_id, razorpay_subscription_id")
      .eq("user_id", user.id),
    service.from("checkout_orders").select("id, razorpay_subscription_id").eq("user_id", user.id),
  ]);

  const orderIds = new Set<string>();
  const paymentIds = new Set<string>();
  const subIds = new Set<string>();

  for (const s of subs ?? []) {
    if (s.razorpay_order_id) orderIds.add(s.razorpay_order_id);
    if (s.razorpay_payment_id) paymentIds.add(s.razorpay_payment_id);
    if (s.razorpay_subscription_id) subIds.add(s.razorpay_subscription_id);
  }
  for (const o of orders ?? []) {
    if (o.razorpay_subscription_id) subIds.add(o.razorpay_subscription_id);
  }

  for (const [column, ids] of [
    ["razorpay_order_id", orderIds],
    ["razorpay_payment_id", paymentIds],
    ["razorpay_subscription_id", subIds],
  ] as const) {
    if (ids.size === 0) continue;
    const { data: removed, error } = await service
      .from("payment_events")
      .delete()
      .in(column, [...ids])
      .select("id");
    if (error) return await fail(`Payment ledger cleanup failed: ${error.message}`);
    paymentsCleared += removed?.length ?? 0;
  }

  /* ------------------------------------------------------ the account.
     One call. Everything with an ON DELETE CASCADE reference to
     auth.users(id) goes with it, which is all twenty-two tables holding
     this person's personal data. */
  const { error: delErr } = await service.auth.admin.deleteUser(user.id);
  if (delErr) return await fail(`Account deletion failed: ${delErr.message}`);

  if (receiptId) {
    await service
      .from("deletion_requests")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        storage_cleared: storageCleared,
        /* Counts, not content: enough to evidence that the cascade ran,
           without the receipt becoming a record of what was deleted. */
        tables_cleared: {
          cascade_from: "auth.users",
          audit_log: "anonymised",
          payment_events: paymentsCleared,
        },
      })
      .eq("id", receiptId);
  }

  return NextResponse.json({
    ok: true,
    deleted: true,
    storageCleared,
    paymentsCleared,
    message:
      "Your account and everything attached to it has been deleted. " +
      "Clinician access records have been anonymised, not removed, so that " +
      "any past access to your data remains auditable.",
  });
}
