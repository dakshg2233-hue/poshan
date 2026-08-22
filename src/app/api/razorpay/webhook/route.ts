import crypto from "node:crypto";
import { serviceClient } from "@/lib/supabase";

/**
 * Razorpay webhook: the actual source of truth for payments.
 *
 * Why this route exists: the browser `handler` callback in checkout only runs
 * if the customer's tab survives the payment. Close it, lose signal, or hit a
 * flaky network and the money is taken while your database never hears about
 * it. Razorpay retries this webhook until it gets a 2xx, so this is what you
 * reconcile against, never the client.
 *
 * Set the endpoint and secret in the Razorpay dashboard, subscribe to
 * `payment.captured` and `payment.failed`.
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
    payload?: { payment?: { entity?: Record<string, unknown> } };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Malformed payload." }, { status: 400 });
  }

  const payment = event.payload?.payment?.entity;
  const paymentId = payment?.id as string | undefined;
  const orderId = payment?.order_id as string | undefined;
  const amount = payment?.amount as number | undefined;

  if (!paymentId || !orderId) {
    return Response.json({ ok: true, ignored: true });
  }

  const db = serviceClient();
  if (db) {
    /* The unique constraint on razorpay_payment_id makes this idempotent:
       Razorpay retries webhooks, and a retry must not extend a subscription
       a second time. */
    await db.from("payment_events").upsert(
      {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        signature_valid: true,
        amount_paise: amount ?? null,
        source: "webhook",
        raw: event as unknown as Record<string, unknown>,
      },
      { onConflict: "razorpay_payment_id", ignoreDuplicates: true }
    );
  }

  /* Always 2xx on a verified event, otherwise Razorpay retries forever. */
  return Response.json({ ok: true, event: event.event ?? null });
}
