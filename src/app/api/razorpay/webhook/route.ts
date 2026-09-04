import crypto from "node:crypto";
import { serviceClient } from "@/lib/supabase";
import { provisionRecurringCharge } from "@/lib/razorpay-provision";

/**
 * Razorpay webhook: the actual source of truth for billing.
 *
 * Why this route exists: the browser `handler` callback in checkout only runs
 * if the customer's tab survives the payment. Close it, lose signal, or hit a
 * flaky network and the money is taken while your database never hears about
 * it. Razorpay retries this webhook until it gets a 2xx, so this is what you
 * reconcile against, never the client.
 *
 * Set the endpoint and secret in the Razorpay dashboard, subscribe to
 * `subscription.charged` (moves status to "active" on every real billing
 * cycle, initial or renewal) — `subscription.cancelled` and
 * `subscription.halted` are real gaps this does not yet close: neither is
 * handled here, so a cancelled-in-Razorpay subscription stays "active" in
 * Poshan's own database until someone adds that.
 *
 * ⚠ The payload shape below (`payload.subscription.entity` +
 * `payload.payment.entity`) follows Razorpay's documented resource.action
 * webhook convention but was not confirmed against a live delivery while
 * writing this — no Razorpay account is configured yet. Check an actual
 * `subscription.charged` payload once one exists and fix the field paths
 * below if they differ.
 */

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
    };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Malformed payload." }, { status: 400 });
  }

  const payment = event.payload?.payment?.entity;
  const subscription = event.payload?.subscription?.entity;
  const paymentId = payment?.id as string | undefined;
  const subscriptionId = (subscription?.id ?? payment?.subscription_id) as string | undefined;
  const amount = payment?.amount as number | undefined;

  if (!paymentId || !subscriptionId) {
    return Response.json({ ok: true, ignored: true });
  }

  const db = serviceClient();
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
