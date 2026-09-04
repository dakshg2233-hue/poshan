import { serviceClient } from "@/lib/supabase";

/**
 * Grants or updates a Poshan Home subscription.
 *
 * Neither /verify nor the webhook is handed a trustworthy user_id or plan by
 * Razorpay's own callback — both only prove a signature over an id pair. The
 * subscription itself, fetched fresh from Razorpay here, is the one place
 * both are authoritative: `user_id` and `plan` were stashed in its `notes`
 * at creation (see /api/razorpay/subscription).
 *
 * Two entry points, because a trial's start and a recurring charge are
 * genuinely different events, not the same write with different values:
 *  - provisionTrialStart grants access the moment checkout succeeds, before
 *    any money has moved — that is what the trial promises.
 *  - provisionRecurringCharge fires on every actual billing cycle and moves
 *    status from "trialing" to "active" (or renews an already-active row).
 * Both upsert on razorpay_subscription_id, the one identifier stable across
 * a subscription's whole lifetime — razorpay_payment_id changes every
 * cycle, so it can no longer be the conflict key the one-time-Order version
 * of this file used.
 */

async function fetchSubscription(subscriptionId: string): Promise<Record<string, unknown> | null> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;

  const res = await fetch(`https://api.razorpay.com/v1/subscriptions/${subscriptionId}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
    },
  });
  if (!res.ok) return null;
  return res.json();
}

/** Called right after checkout's authorization step succeeds — see /api/razorpay/verify. */
export async function provisionTrialStart(
  subscriptionId: string,
  paymentId: string
): Promise<boolean> {
  const subscription = await fetchSubscription(subscriptionId);
  if (!subscription) return false;

  const notes = subscription.notes as Record<string, string> | undefined;
  const userId = notes?.user_id;
  const plan = notes?.plan === "yearly" ? "yearly" : "monthly";
  const startAt = subscription.start_at as number | undefined;
  if (!userId || !startAt) return false;

  const db = serviceClient();
  if (!db) return false;

  const { error } = await db.from("subscriptions").upsert(
    {
      user_id: userId,
      product: "home",
      plan,
      status: "trialing",
      razorpay_subscription_id: subscriptionId,
      razorpay_payment_id: paymentId,
      /* The authorization step, not the eventual subscription amount — the
         real charge (and its real amount) is recorded by
         provisionRecurringCharge when it actually happens. */
      amount_paise: 100,
      current_period_end: new Date(startAt * 1000).toISOString(),
    },
    { onConflict: "razorpay_subscription_id" }
  );

  return !error;
}

/**
 * Called on the webhook's `subscription.charged` event — the source of
 * truth for every actual billing cycle, initial or renewal alike.
 */
export async function provisionRecurringCharge(
  subscriptionId: string,
  paymentId: string,
  amountPaise: number
): Promise<boolean> {
  const subscription = await fetchSubscription(subscriptionId);
  if (!subscription) return false;

  const notes = subscription.notes as Record<string, string> | undefined;
  const userId = notes?.user_id;
  const plan = notes?.plan === "yearly" ? "yearly" : "monthly";
  /* `current_end` is Razorpay's own record of when the cycle just paid for
     runs out — authoritative, not computed here. */
  const currentEnd = subscription.current_end as number | undefined;
  if (!userId || !currentEnd) return false;

  const db = serviceClient();
  if (!db) return false;

  const { error } = await db.from("subscriptions").upsert(
    {
      user_id: userId,
      product: "home",
      plan,
      status: "active",
      razorpay_subscription_id: subscriptionId,
      razorpay_payment_id: paymentId,
      amount_paise: amountPaise,
      current_period_end: new Date(currentEnd * 1000).toISOString(),
    },
    { onConflict: "razorpay_subscription_id" }
  );

  return !error;
}
