import crypto from "node:crypto";
import { serviceClient } from "@/lib/supabase";
import { markSubscriptionEnded, provisionRecurringCharge } from "@/lib/razorpay-provision";

/**
 * Razorpay webhook: the actual source of truth for billing.
 *
 * Why this route exists: the browser `handler` callback in checkout only runs
 * if the customer's tab survives the payment. Close it, lose signal, or hit a
 * flaky network and the money is taken while your database never hears about
 * it. Razorpay retries this webhook until it gets a 2xx, so this is what you
 * reconcile against, never the client.
 *
 * Set the endpoint and secret in the Razorpay dashboard, and subscribe to
 * four events: `subscription.charged` (moves status to "active" on every
 * real billing cycle, initial or renewal) plus `subscription.cancelled`,
 * `subscription.halted` and `subscription.completed`, which are the three
 * ways billing stops and so the three ways access has to stop with it.
 *
 * Subscribe `refund.processed` too: a refund reverses a charge that already
 * granted access, so access has to go back with the money.
 *
 * `subscription.paused` is deliberately not handled. Pausing only happens
 * if something calls Razorpay's pause API, which nothing here does, and
 * handling it properly needs a `subscription.resumed` path to restore
 * access — half of that pair is worse than neither.
 *
 * Every delivery is recorded in `webhook_events` keyed on Razorpay's own
 * x-razorpay-event-id before anything is acted on, so a retried event is
 * answered 200 and dropped rather than processed twice.
 *
 * ⚠ The payload shape below (`payload.subscription.entity` +
 * `payload.payment.entity`) follows Razorpay's documented resource.action
 * webhook convention but was not confirmed against a live delivery while
 * writing this — no Razorpay account is configured yet. Check an actual
 * `subscription.charged` payload once one exists and fix the field paths
 * below if they differ.
 */

/**
 * Razorpay events that mean billing has stopped, mapped to the status this
 * app stores. The `subscriptions.status` check constraint accepts exactly
 * 'trialing', 'active', 'cancelled' and 'expired', so these are the only
 * two terminal values that can be written — 'halted' is not one of them,
 * and a halted subscription is a cancelled one from the customer's side:
 * Razorpay has exhausted its retries and will not charge again.
 */
const SUBSCRIPTION_ENDED: Record<string, "cancelled" | "expired"> = {
  "subscription.cancelled": "cancelled",
  "subscription.halted": "cancelled",
  /* Ran out its total_count honestly rather than being stopped. */
  "subscription.completed": "expired",
};

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return Response.json({ configured: false }, { status: 503 });
  }

  /* Signature is computed over the RAW body. Parsing first and re-stringifying
     would change the bytes and break verification. */
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!signature) {
    return Response.json({ error: "Missing signature." }, { status: 400 });
  }

  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!valid) {
    /* Do not echo anything useful: an attacker probing the endpoint learns
       nothing beyond "rejected". */
    return Response.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: {
    event?: string;
    payload?: {
      payment?: { entity?: Record<string, unknown> };
      subscription?: { entity?: Record<string, unknown> };
      refund?: { entity?: Record<string, unknown> };
    };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Malformed payload." }, { status: 400 });
  }

  /* Replay protection, before anything is acted on. Razorpay reuses this id
     across every retry of the same event, so the primary key on
     webhook_events is what makes "handled exactly once" true of the
     database rather than of each handler in turn. A delivery with no id
     (or no database configured) still gets processed — the individual
     handlers below are each idempotent on their own — it just loses this
     outer guarantee. */
  const eventId = request.headers.get("x-razorpay-event-id");
  const db = serviceClient();
  if (eventId && db) {
    const { error } = await db
      .from("webhook_events")
      .insert({ razorpay_event_id: eventId, event: event.event ?? "unknown" });
    /* 23505 = unique violation, i.e. this exact delivery was already handled. */
    if (error?.code === "23505") {
      return Response.json({ ok: true, duplicate: true });
    }
  }

  const payment = event.payload?.payment?.entity;
  const subscription = event.payload?.subscription?.entity;
  const refund = event.payload?.refund?.entity;
  const paymentId = payment?.id as string | undefined;
  const subscriptionId = (subscription?.id ?? payment?.subscription_id) as string | undefined;
  const amount = payment?.amount as number | undefined;

  if (!subscriptionId) {
    return Response.json({ ok: true, ignored: true });
  }

  /* Money going back out. A full refund reverses the charge that granted
     access, so the access goes with it. A partial refund is deliberately
     left alone: "half the money back" has no obvious access answer, and
     guessing one wrong either robs a paying customer or gives away the
     product — a human should decide that one. */
  if (event.event === "refund.created" || event.event === "refund.processed") {
    const refunded = refund?.amount as number | undefined;
    if (refunded && amount && refunded >= amount) {
      const revoked = await markSubscriptionEnded(subscriptionId, "cancelled");
      return Response.json({ ok: true, event: event.event, status: "cancelled", revoked });
    }
    return Response.json({ ok: true, event: event.event, partialRefund: true });
  }

  /* Handled before the paymentId guard below, because an event that ends a
     subscription carries no payment entity at all — there is no charge to
     describe. That guard used to run first and drop every one of them,
     which is exactly how a cancelled subscription kept its access. */
  const endedAs = SUBSCRIPTION_ENDED[event.event ?? ""];
  if (endedAs) {
    const revoked = await markSubscriptionEnded(subscriptionId, endedAs);
    return Response.json({ ok: true, event: event.event, status: endedAs, revoked });
  }

  if (!paymentId) {
    return Response.json({ ok: true, ignored: true });
  }

  if (db) {
    /* The unique constraint on razorpay_payment_id makes this idempotent:
       Razorpay retries webhooks, and a retry must not extend a subscription
       a second time. */
    await db.from("payment_events").upsert(
      {
        razorpay_subscription_id: subscriptionId,
        razorpay_payment_id: paymentId,
        signature_valid: true,
        amount_paise: amount ?? null,
        source: "webhook",
        raw: event as unknown as Record<string, unknown>,
      },
      { onConflict: "razorpay_payment_id", ignoreDuplicates: true }
    );
  }

  /* The source of truth: grants/renews access even if the customer's tab
     never survived long enough for /verify to fire, and moves a trialing
     row to "active" once real money has actually moved. Every other
     subscribed event reaches here too and must not grant anything. */
  if (event.event === "subscription.charged" && amount) {
    await provisionRecurringCharge(subscriptionId, paymentId, amount);
  }

  /* Always 2xx on a verified event, otherwise Razorpay retries forever. */
  return Response.json({ ok: true, event: event.event ?? null });
}
