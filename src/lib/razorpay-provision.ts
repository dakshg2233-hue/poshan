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
  const product = notes?.product === "college" ? "college" : "home";
  const plan = notes?.plan === "yearly" ? "yearly" : "monthly";
  const startAt = subscription.start_at as number | undefined;
  if (!userId || !startAt) return false;

  const db = serviceClient();
  if (!db) return false;

  const { error } = await db.from("subscriptions").upsert(
    {
      user_id: userId,
      product,
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
 * Compares what Razorpay actually charged against what Poshan's own code
 * said this SKU costs when checkout started (checkout_orders, written by
 * /api/razorpay/subscription from the PREMIUM and COLLEGE_PLAN constants).
 *
 * Recorded, never enforced. By the time this runs the customer's money has
 * already moved, so refusing them access over an accounting discrepancy
 * punishes the only person in the transaction who did nothing wrong. What
 * it buys instead is that a Plan edited in the Razorpay dashboard stops
 * being invisible:
 *
 *   select * from checkout_orders where amount_mismatch;
 *
 * Failures here are swallowed deliberately. Reconciliation is bookkeeping;
 * it must never be the reason a paid subscription fails to provision.
 */
async function reconcileCharge(subscriptionId: string, amountPaise: number): Promise<void> {
  const db = serviceClient();
  if (!db) return;

  const { data: order } = await db
    .from("checkout_orders")
    .select("id, expected_amount_paise")
    .eq("razorpay_subscription_id", subscriptionId)
    .maybeSingle();

  if (!order) return;

  await db
    .from("checkout_orders")
    .update({
      last_charged_amount_paise: amountPaise,
      amount_mismatch: amountPaise !== order.expected_amount_paise,
    })
    .eq("id", order.id);
}

/**
 * Called on the webhook's `subscription.charged` event — the source of
 * truth for every actual billing cycle, initial or renewal alike.
 */
/* Razorpay subscription states after which no charge should grant access. */
const ENDED_STATUSES = new Set(["cancelled", "completed", "halted", "expired"]);

export async function provisionRecurringCharge(
  subscriptionId: string,
  paymentId: string,
  amountPaise: number
): Promise<boolean> {
  const subscription = await fetchSubscription(subscriptionId);
  if (!subscription) return false;

  const notes = subscription.notes as Record<string, string> | undefined;
  const userId = notes?.user_id;
  const product = notes?.product === "college" ? "college" : "home";
  const plan = notes?.plan === "yearly" ? "yearly" : "monthly";
  /* `current_end` is Razorpay's own record of when the cycle just paid for
     runs out — authoritative, not computed here. */
  const currentEnd = subscription.current_end as number | undefined;
  /* false means "try again later", and the webhook turns it into a 500
     that Razorpay retries. A subscription with no Poshan user on it (the
     Razorpay account is shared) will never succeed, so it is true: done,
     nothing to grant. Retrying it would never end. */
  if (!userId || !currentEnd) return true;

  /* Webhooks are not delivered in order. A subscription.charged that was
     retried hours later can land after subscription.cancelled, and
     upserting "active" here would quietly restore access the customer
     cancelled. The subscription was just fetched from Razorpay, so its
     status is the current truth: if it has ended, record nothing. */
  if (ENDED_STATUSES.has(String(subscription.status))) return true;

  const db = serviceClient();
  if (!db) return false;

  const { error } = await db.from("subscriptions").upsert(
    {
      user_id: userId,
      product,
      plan,
      status: "active",
      razorpay_subscription_id: subscriptionId,
      razorpay_payment_id: paymentId,
      amount_paise: amountPaise,
      current_period_end: new Date(currentEnd * 1000).toISOString(),
    },
    { onConflict: "razorpay_subscription_id" }
  );

  /* After the grant, never before it: bookkeeping must not stand between a
     paying customer and the thing they paid for. */
  await reconcileCharge(subscriptionId, amountPaise);

  return !error;
}

/**
 * Ends access when Razorpay says billing has stopped.
 *
 * Every premium gate in the app reads `status in ('trialing','active')` —
 * ten of them, from /api/chat to the dashboard — and until now nothing in
 * the codebase ever wrote any other value. A subscriber who cancelled, or
 * whose card failed through every retry, kept full paid access forever:
 * Razorpay stopped charging them and Poshan never noticed.
 *
 * An update, not an upsert. No row for this subscription id means there is
 * nothing to revoke, and inventing one would be worse than doing nothing.
 */
export async function markSubscriptionEnded(
  subscriptionId: string,
  status: "cancelled" | "expired"
): Promise<boolean> {
  const db = serviceClient();
  if (!db) return false;

  const { error } = await db
    .from("subscriptions")
    .update({ status })
    .eq("razorpay_subscription_id", subscriptionId);

  return !error;
}
