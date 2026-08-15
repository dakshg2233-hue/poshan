import crypto from "node:crypto";
import { serviceClient } from "@/lib/supabase";
import { clientIp, rateLimit, tooMany, readJsonCapped } from "@/lib/rate-limit";

/**
 * Verifies a completed Razorpay payment.
 *
 * The client cannot be trusted to report its own success — anyone can POST
 * "payment done". Razorpay signs `order_id|payment_id` with the key secret
 * and only the server can recompute that.
 *
 * Three protections beyond the signature itself:
 *  1. Rate limited, so the signature cannot be brute-forced.
 *  2. Constant-time compare, so it cannot be probed byte by byte.
 *  3. Replay protection — a valid payment id is recorded once and reused
 *     attempts are rejected, otherwise the same successful payment could be
 *     submitted repeatedly to extend a subscription for free.
 *
 * This route is a convenience for instant UI feedback. The webhook is the
 * source of truth; never grant access on this alone in production.
 */

type Body = {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
};

export async function POST(request: Request) {
  const gate = rateLimit(`verify:${clientIp(request)}`, { limit: 10, windowMs: 60_000 });
  if (!gate.ok) return tooMany(gate.retryAfter);

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return Response.json({ configured: false, verified: false }, { status: 503 });
  }

  const parsed = await readJsonCapped<Body>(request, 4_096);
  if (!parsed.ok) return parsed.response;

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return Response.json({ verified: false, error: "Missing payment fields." }, { status: 400 });
  }

  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(razorpay_signature, "utf8");
  const verified = a.length === b.length && crypto.timingSafeEqual(a, b);

  const db = serviceClient();

  if (!verified) {
    if (db) {
      await db.from("payment_events").upsert(
        {
          razorpay_order_id,
          razorpay_payment_id,
          signature_valid: false,
          source: "client",
        },
        { onConflict: "razorpay_payment_id", ignoreDuplicates: true }
      );
    }
    /* Deliberately vague — do not tell a prober which field was wrong. */
    return Response.json({ verified: false, error: "Verification failed." }, { status: 400 });
  }

  if (db) {
    const { error } = await db.from("payment_events").insert({
      razorpay_order_id,
      razorpay_payment_id,
      signature_valid: true,
      source: "client",
    });
    /* 23505 = unique violation, i.e. this payment id was already recorded. */
    if (error && error.code === "23505") {
      return Response.json(
        { verified: false, error: "This payment has already been processed." },
        { status: 409 }
      );
    }
  }

  return Response.json({ verified: true, paymentId: razorpay_payment_id });
}
