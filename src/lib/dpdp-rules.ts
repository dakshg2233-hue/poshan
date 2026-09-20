import type { ConsentPurpose } from "./dpdp";
import { CONSENT_PURPOSES, isMinor } from "./dpdp";

/**
 * The decisions the DPDP routes make, lifted out of the routes.
 *
 * vitest.config.ts is explicit that this codebase tests pure logic and not
 * mocked I/O, and it is right to be: a route test built on a fake Supabase
 * client mostly asserts that the fake behaves like the fake. But the
 * routes added for the DPDP work carry real rules — which consent row
 * counts as current, whether a guardian may add this person, which
 * payment records belong to an account that is about to be erased — and
 * those were only reachable by going through HTTP.
 *
 * So they live here instead, as functions over plain data, and the routes
 * call them. Same rules, same behaviour, but now they can be tested the
 * way the rest of this codebase tests things, and a mistake in one of them
 * fails a suite rather than a Data Principal.
 */

/* ------------------------------------------------------------- consent */

export type ConsentRow = {
  purpose: string;
  granted: boolean;
  notice_version?: string | null;
  notice_lang?: string | null;
  created_at?: string | null;
};

export type ConsentState = {
  purpose: ConsentPurpose;
  /** null means never asked — deliberately distinct from "said no". */
  granted: boolean | null;
  noticeVersion: string | null;
  lang: string | null;
  at: string | null;
  /** The words changed since they agreed; ask again rather than assume. */
  stale: boolean;
};

/**
 * Current consent per purpose: the most recent row wins.
 *
 * The ledger is append-only, so a withdrawal is a newer row rather than an
 * edit, and "what does this person currently allow?" is a reduction over
 * history rather than a lookup. Doing that reduction in one place is what
 * stops one route reading the newest row and another accidentally reading
 * the first.
 *
 * Sorts defensively rather than trusting the caller's ORDER BY. A route
 * that forgets it would otherwise get the oldest consent silently treated
 * as the live one, which fails in the most dangerous direction: an old
 * grant outliving the withdrawal that was supposed to end it.
 */
export function latestConsentPerPurpose(
  rows: ConsentRow[],
  currentNoticeVersion: string
): ConsentState[] {
  const sorted = [...rows].sort((a, b) => {
    const at = a.created_at ? Date.parse(a.created_at) : 0;
    const bt = b.created_at ? Date.parse(b.created_at) : 0;
    return bt - at;
  });

  const latest = new Map<string, ConsentRow>();
  for (const r of sorted) {
    if (!latest.has(r.purpose)) latest.set(r.purpose, r);
  }

  return CONSENT_PURPOSES.map((p) => {
    const row = latest.get(p);
    return {
      purpose: p,
      granted: row ? row.granted : null,
      noticeVersion: row?.notice_version ?? null,
      lang: row?.notice_lang ?? null,
      at: row?.created_at ?? null,
      stale: row ? row.notice_version !== currentNoticeVersion : false,
    };
  });
}

/* --------------------------------------------------- parental consent */

/**
 * A verification token is 16 random bytes as hex — exactly 32 lowercase hex
 * characters. Nothing else is accepted.
 *
 * Checked before the token reaches a query, so a malformed one is rejected
 * as a shape error rather than becoming a database lookup. That keeps the
 * endpoint from being usable to probe: every bad token costs the same and
 * tells the caller the same thing.
 */
const TOKEN_SHAPE = /^[a-f0-9]{32}$/;

export function isValidConsentToken(token: unknown): token is string {
  return typeof token === "string" && TOKEN_SHAPE.test(token);
}

export type ParentalConsentRow = {
  verified_at?: string | null;
  revoked_at?: string | null;
  token_expires_at?: string | null;
};

export type TokenState = "pending" | "already_confirmed" | "expired" | "revoked";

/**
 * What state a consent token is in, given the row and the current time.
 *
 * Order matters and is not arbitrary. Revoked is checked before expired,
 * because a guardian who actively refused should be told their refusal was
 * recorded rather than that their link timed out — the second reads as an
 * invitation to ask for a new one. And confirmed is checked before expiry
 * so that a guardian following an old link after consenting sees "already
 * done" rather than a failure.
 */
export function tokenState(row: ParentalConsentRow, now: number = Date.now()): TokenState {
  if (row.revoked_at) return "revoked";
  if (row.verified_at) return "already_confirmed";
  if (row.token_expires_at && Date.parse(row.token_expires_at) < now) return "expired";
  return "pending";
}

/* ---------------------------------------------------- family members */

export type FamilyBasis = "self_declared_guardian" | "informed_adult";

export type BasisCheck = { ok: true; basis: FamilyBasis } | { ok: false; reason: string };

/**
 * May this account holder add this person, on the basis they claim?
 *
 * Two rules, and the second is the one that matters. Any basis must be
 * stated — s.5 does not let Poshan hold a third party's health data on no
 * stated footing at all. And a child requires a guardian specifically: an
 * "informed adult" declaration over an age of nine is not a weaker
 * consent, it is a contradiction, and it is exactly the shape a careless
 * or deliberate bypass takes.
 *
 * The age is read from the row being written rather than from anything the
 * client asserts separately, so the two cannot disagree.
 */
export function checkFamilyBasis(basis: unknown, age: number | null | undefined): BasisCheck {
  if (basis !== "self_declared_guardian" && basis !== "informed_adult") {
    return {
      ok: false,
      reason:
        "Confirm how you may provide this person's data: as their guardian, " +
        "or as an adult who knows you are adding them.",
    };
  }

  if (isMinor({ age: age ?? null }) === true && basis !== "self_declared_guardian") {
    return {
      ok: false,
      reason:
        "This person is under 18. Only a parent or guardian may add them, " +
        "and we will email that guardian for permission before their data is used.",
    };
  }

  return { ok: true, basis };
}

/* -------------------------------------------------------- erasure */

export type SubscriptionRow = {
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  razorpay_subscription_id?: string | null;
};

export type CheckoutOrderRow = {
  id?: string | null;
  razorpay_subscription_id?: string | null;
};

export type RazorpayIds = {
  orderIds: string[];
  paymentIds: string[];
  subscriptionIds: string[];
};

/**
 * Every Razorpay identifier belonging to an account.
 *
 * payment_events has no user_id and no foreign key to auth.users — it is
 * keyed by Razorpay's own identifiers so a webhook arriving with no
 * session can still be recorded. The consequence is that deleting the user
 * does not touch it, and its raw column holds whatever Razorpay sent,
 * which routinely includes an email and a phone number. An erased account
 * that leaves a payment record with contact details in it has not been
 * erased.
 *
 * These ids are the only bridge back to those rows, and they exist only in
 * tables that are about to be cascaded away — so this has to run before
 * the deletion, not after, and it has to find all of them. Missing one
 * leaves a row that nothing will ever point at again.
 *
 * Deduplicated because the same subscription id legitimately appears on
 * both a subscription and its checkout order, and an `in (...)` clause
 * with the same value twice is a wasted round trip at best.
 */
export function collectRazorpayIds(
  subs: SubscriptionRow[] | null | undefined,
  orders: CheckoutOrderRow[] | null | undefined
): RazorpayIds {
  const orderIds = new Set<string>();
  const paymentIds = new Set<string>();
  const subscriptionIds = new Set<string>();

  for (const s of subs ?? []) {
    if (s.razorpay_order_id) orderIds.add(s.razorpay_order_id);
    if (s.razorpay_payment_id) paymentIds.add(s.razorpay_payment_id);
    if (s.razorpay_subscription_id) subscriptionIds.add(s.razorpay_subscription_id);
  }
  for (const o of orders ?? []) {
    if (o.razorpay_subscription_id) subscriptionIds.add(o.razorpay_subscription_id);
    /* checkout_orders.id is Poshan's own POSHAN-<hex> reference, which the
       payment ledger also records as an order id. Collected for the same
       reason as the rest: a row nothing points at is a row nobody erases. */
    if (o.id) orderIds.add(o.id);
  }

  return {
    orderIds: [...orderIds],
    paymentIds: [...paymentIds],
    subscriptionIds: [...subscriptionIds],
  };
}

/**
 * The confirmation an irreversible delete requires.
 *
 * A bare DELETE is not enough. Prefetchers, link scanners and a replayed
 * request all issue methods without a human deciding anything, and this
 * particular request cannot be undone — so the caller has to say the word
 * out loud. Compared exactly: a case-insensitive match would accept a
 * "delete" that some client lowercased in passing.
 */
export function isDeleteConfirmed(confirm: unknown): boolean {
  return confirm === "DELETE";
}
