import { PREMIUM } from "@/lib/poshan-data";
import { clientIp, rateLimit, tooMany, readJsonCapped } from "@/lib/rate-limit";

/**
 * Creates a Razorpay order.
 *
 * The app never sees a card number. Razorpay's hosted checkout collects
 * payment details on their domain; we only create the order here and verify
 * the signature afterwards. That is both the PCI-DSS-correct design and the
 * reason there is no card form anywhere in this codebase.
 *
 * Needs RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET. Without them this returns
 * 503 rather than pretending a payment succeeded.
 */
export async function POST(request: Request) {
  /* Order creation costs a Razorpay API call, so it is worth rate limiting
     purely to stop someone running up your account. */
  const gate = rateLimit(`order:${clientIp(request)}`, { limit: 8, windowMs: 60_000 });
  if (!gate.ok) return tooMany(gate.retryAfter);

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return Response.json(
      {
        configured: false,
        reason:
          "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are not set on the server, so checkout is not connected yet.",
      },
      { status: 503 }
    );
  }

  const parsed = await readJsonCapped<{ plan?: "monthly" | "yearly" }>(request, 1_024);
  if (!parsed.ok) return parsed.response;

  const plan = parsed.data.plan === "yearly" ? "yearly" : "monthly";
  /* Amount is decided here, never taken from the client — otherwise a caller
     could set their own price. */
  const rupees = plan === "yearly" ? PREMIUM.yearly : PREMIUM.monthly;

  try {
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      },
      body: JSON.stringify({
        amount: rupees * 100, // paise
        currency: "INR",
        receipt: `poshan_${plan}_${Date.now()}`,
        notes: { plan, product: "Poshan Home" },
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return Response.json(
        { error: "Razorpay rejected the order.", detail: detail.slice(0, 300) },
        { status: 502 }
      );
    }

    const order = await res.json();
    return Response.json({
      configured: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId, // publishable, safe to send; the secret never leaves the server
      plan,
    });
  } catch (err) {
    return Response.json(
      { error: "Could not reach Razorpay.", detail: String(err).slice(0, 200) },
      { status: 502 }
    );
  }
}
