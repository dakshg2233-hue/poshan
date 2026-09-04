import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { PREMIUM } from "@/lib/poshan-data";
import { clientIp, rateLimit, tooMany, readJsonCapped } from "@/lib/rate-limit";

/**
 * Creates a Razorpay Subscription, not a one-time Order.
 *
 * Poshan Home's own pricing page promises a real trial — "TODAY: full
 * access, no payment taken" / "DAY 7: charged, unless cancelled" — so
 * checkout has to actually defer billing, not just say it does. Razorpay's
 * mechanism for that: create a Subscription with `start_at` set to a future
 * timestamp. The checkout still runs an authorization step now (so the
 * payment method is verified and on file), but the first real charge only
 * happens at `start_at`. Source: Razorpay's own subscriptions guide
 * ("providing a future start_at date creates... a free trial period").
 *
 * Needs a Plan created ahead of time — Plans are a one-time setup, normally
 * done once via the Razorpay dashboard or a single API call, not per
 * checkout — referenced here by RAZORPAY_PLAN_ID_MONTHLY / _YEARLY. Without
 * either the keys or the plan ids this returns 503 rather than pretending a
 * subscription was created.
 *
 * Requires a signed-in user: the subscription's `notes.user_id` is the only
 * trustworthy link back to an account by the time /verify or the webhook
 * fires, since neither is handed a user id by Razorpay itself.
 */
export async function POST(request: NextRequest) {
  /* Subscription creation costs a Razorpay API call, so it is worth rate
     limiting purely to stop someone running up your account. */
  const gate = rateLimit(`subscription:${clientIp(request)}`, { limit: 8, windowMs: 60_000 });
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return Response.json({ error: "Sign in to subscribe." }, { status: 401 });
  }
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Sign in to subscribe." }, { status: 401 });
  }

  const parsed = await readJsonCapped<{ plan?: "monthly" | "yearly" }>(request, 1_024);
  if (!parsed.ok) return parsed.response;

  const plan = parsed.data.plan === "yearly" ? "yearly" : "monthly";
  const planId =
    plan === "yearly" ? process.env.RAZORPAY_PLAN_ID_YEARLY : process.env.RAZORPAY_PLAN_ID_MONTHLY;

  if (!planId) {
    return Response.json(
      {
        configured: false,
        reason: `RAZORPAY_PLAN_ID_${plan.toUpperCase()} is not set: create the ${plan} Plan in the Razorpay dashboard first, then add its id here.`,
      },
      { status: 503 }
    );
  }

  /* Ten years of cycles. Razorpay Subscriptions require a finite total_count
     — there is no "forever" option — so this is a large-but-bounded stand-in
     for indefinite billing; a fresh subscription can be created if anyone
     ever actually reaches the end of it. */
  const totalCount = plan === "yearly" ? 10 : 120;
  const startAt = Math.floor(Date.now() / 1000) + PREMIUM.trialDays * 24 * 60 * 60;

  try {
    const res = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      },
      body: JSON.stringify({
        plan_id: planId,
        total_count: totalCount,
        customer_notify: 1,
        start_at: startAt,
        /* The only durable link between this subscription and an account:
           neither /verify nor the webhook is ever handed a user id by
           Razorpay itself, so provisioning reads it back from here. */
        notes: { plan, product: "home", user_id: user.id },
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return Response.json(
        { error: "Razorpay rejected the subscription.", detail: detail.slice(0, 300) },
        { status: 502 }
      );
    }

    const subscription = await res.json();
    return Response.json({
      configured: true,
      subscriptionId: subscription.id,
      keyId, // publishable, safe to send; the secret never leaves the server
      plan,
      trialEndsAt: startAt,
    });
  } catch (err) {
    return Response.json(
      { error: "Could not reach Razorpay.", detail: String(err).slice(0, 200) },
      { status: 502 }
    );
  }
}
