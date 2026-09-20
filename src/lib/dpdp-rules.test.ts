import { describe, it, expect } from "vitest";
import {
  latestConsentPerPurpose,
  isValidConsentToken,
  tokenState,
  checkFamilyBasis,
  collectRazorpayIds,
  isDeleteConfirmed,
} from "./dpdp-rules";

/**
 * The rules the DPDP routes run on.
 *
 * Every case here is one where getting it wrong has a consequence outside
 * the code: an old consent outliving its withdrawal, a child added by
 * somebody who is not their guardian, a payment record with an email in it
 * surviving an erasure that was supposed to be complete. Written as the
 * failures rather than as the happy paths, because the happy paths are not
 * what these functions are for.
 */

const V = "2026-09-20.1";

describe("latestConsentPerPurpose", () => {
  it("treats the newest row as current", () => {
    const rows = [
      { purpose: "analytics_cookies", granted: true, created_at: "2026-01-01T00:00:00Z" },
      { purpose: "analytics_cookies", granted: false, created_at: "2026-06-01T00:00:00Z" },
    ];
    const got = latestConsentPerPurpose(rows, V).find((c) => c.purpose === "analytics_cookies");
    expect(got?.granted).toBe(false);
  });

  it("sorts for itself rather than trusting the caller's order", () => {
    /* The dangerous direction: if an unsorted list let the oldest row win,
       a withdrawal would silently stop taking effect and the grant it
       replaced would live on. Same rows as above, reversed. */
    const rows = [
      { purpose: "analytics_cookies", granted: false, created_at: "2026-06-01T00:00:00Z" },
      { purpose: "analytics_cookies", granted: true, created_at: "2026-01-01T00:00:00Z" },
    ];
    const got = latestConsentPerPurpose(rows, V).find((c) => c.purpose === "analytics_cookies");
    expect(got?.granted).toBe(false);
  });

  it("re-granting after a withdrawal is honoured", () => {
    const rows = [
      { purpose: "analytics_cookies", granted: true, created_at: "2026-01-01T00:00:00Z" },
      { purpose: "analytics_cookies", granted: false, created_at: "2026-02-01T00:00:00Z" },
      { purpose: "analytics_cookies", granted: true, created_at: "2026-03-01T00:00:00Z" },
    ];
    const got = latestConsentPerPurpose(rows, V).find((c) => c.purpose === "analytics_cookies");
    expect(got?.granted).toBe(true);
  });

  it("reports never-asked as null, not false", () => {
    /* A toggle must be able to tell "they declined" from "we never asked".
       Collapsing them makes an untouched purpose look like a refusal. */
    const got = latestConsentPerPurpose([], V);
    expect(got.every((c) => c.granted === null)).toBe(true);
  });

  it("returns every purpose even when nothing was ever recorded", () => {
    const got = latestConsentPerPurpose([], V);
    expect(got.map((c) => c.purpose)).toContain("account_and_health_data");
    expect(got.map((c) => c.purpose)).toContain("family_member_data");
    expect(got.length).toBeGreaterThanOrEqual(5);
  });

  it("flags consent given under an older notice as stale", () => {
    const rows = [
      {
        purpose: "account_and_health_data",
        granted: true,
        notice_version: "2020-01-01.1",
        created_at: "2026-01-01T00:00:00Z",
      },
    ];
    const got = latestConsentPerPurpose(rows, V).find(
      (c) => c.purpose === "account_and_health_data"
    );
    expect(got?.stale).toBe(true);
  });

  it("does not flag consent given under the current notice", () => {
    const rows = [
      {
        purpose: "account_and_health_data",
        granted: true,
        notice_version: V,
        created_at: "2026-01-01T00:00:00Z",
      },
    ];
    const got = latestConsentPerPurpose(rows, V).find(
      (c) => c.purpose === "account_and_health_data"
    );
    expect(got?.stale).toBe(false);
  });

  it("keeps purposes independent of one another", () => {
    const rows = [
      { purpose: "analytics_cookies", granted: false, created_at: "2026-06-01T00:00:00Z" },
      { purpose: "account_and_health_data", granted: true, created_at: "2026-01-01T00:00:00Z" },
    ];
    const got = latestConsentPerPurpose(rows, V);
    expect(got.find((c) => c.purpose === "analytics_cookies")?.granted).toBe(false);
    expect(got.find((c) => c.purpose === "account_and_health_data")?.granted).toBe(true);
  });
});

describe("isValidConsentToken", () => {
  const good = "a".repeat(32);

  it("accepts exactly 32 lowercase hex characters", () => {
    expect(isValidConsentToken(good)).toBe(true);
    expect(isValidConsentToken("0123456789abcdef0123456789abcdef")).toBe(true);
  });

  it("rejects the wrong length", () => {
    expect(isValidConsentToken("a".repeat(31))).toBe(false);
    expect(isValidConsentToken("a".repeat(33))).toBe(false);
    expect(isValidConsentToken("")).toBe(false);
  });

  it("rejects non-hex and uppercase", () => {
    expect(isValidConsentToken("g".repeat(32))).toBe(false);
    expect(isValidConsentToken("A".repeat(32))).toBe(false);
  });

  it("rejects SQL and path payloads outright", () => {
    /* Never reaches a query, so these are shape failures rather than
       anything the database has to defend against. */
    expect(isValidConsentToken("' or 1=1--")).toBe(false);
    expect(isValidConsentToken("../../etc/passwd")).toBe(false);
    expect(isValidConsentToken(`${good} or 1=1`)).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(isValidConsentToken(null)).toBe(false);
    expect(isValidConsentToken(undefined)).toBe(false);
    expect(isValidConsentToken(42)).toBe(false);
    expect(isValidConsentToken({})).toBe(false);
  });
});

describe("tokenState", () => {
  const future = "2099-01-01T00:00:00Z";
  const past = "2020-01-01T00:00:00Z";

  it("is pending for an unused, unexpired token", () => {
    expect(tokenState({ token_expires_at: future })).toBe("pending");
  });

  it("is expired once the window has passed", () => {
    expect(tokenState({ token_expires_at: past })).toBe("expired");
  });

  it("reports a refusal as revoked, not expired", () => {
    /* A guardian who said no should be told it was recorded. "Expired"
       reads as an invitation to request a fresh link, which is the
       opposite of what they asked for. */
    expect(tokenState({ revoked_at: past, token_expires_at: past })).toBe("revoked");
  });

  it("reports an already-used token as confirmed even after expiry", () => {
    expect(tokenState({ verified_at: past, token_expires_at: past })).toBe("already_confirmed");
  });

  it("treats a missing expiry as not expiring", () => {
    expect(tokenState({})).toBe("pending");
  });

  it("expires exactly at the boundary, not after it", () => {
    const t = "2026-09-20T12:00:00Z";
    const at = Date.parse(t);
    expect(tokenState({ token_expires_at: t }, at - 1)).toBe("pending");
    expect(tokenState({ token_expires_at: t }, at + 1)).toBe("expired");
  });
});

describe("checkFamilyBasis", () => {
  it("requires a basis to be stated at all", () => {
    expect(checkFamilyBasis(undefined, 30).ok).toBe(false);
    expect(checkFamilyBasis("", 30).ok).toBe(false);
    expect(checkFamilyBasis("because I said so", 30).ok).toBe(false);
  });

  it("accepts an informed adult", () => {
    expect(checkFamilyBasis("informed_adult", 34).ok).toBe(true);
  });

  it("accepts a guardian for a child", () => {
    expect(checkFamilyBasis("self_declared_guardian", 9).ok).toBe(true);
  });

  it("refuses a child added as an informed adult", () => {
    /* The bypass this function exists to stop. */
    const r = checkFamilyBasis("informed_adult", 9);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toContain("under 18");
  });

  it("refuses at 17 and allows at 18", () => {
    expect(checkFamilyBasis("informed_adult", 17).ok).toBe(false);
    expect(checkFamilyBasis("informed_adult", 18).ok).toBe(true);
  });

  it("refuses a 0-year-old added as an informed adult", () => {
    /* family_members.age allows 0, and 0 is falsy — the exact input a
       truthiness check would wave through. */
    expect(checkFamilyBasis("informed_adult", 0).ok).toBe(false);
  });

  it("allows an unknown age with either basis", () => {
    /* Age is optional on a family profile, so unknown cannot be treated as
       a child here without making the feature unusable. The guardian path
       and the parental-consent flow remain available, and the tracking
       gate still fails closed separately. */
    expect(checkFamilyBasis("informed_adult", null).ok).toBe(true);
    expect(checkFamilyBasis("self_declared_guardian", undefined).ok).toBe(true);
  });
});

describe("collectRazorpayIds", () => {
  it("gathers ids from subscriptions", () => {
    const got = collectRazorpayIds(
      [{ razorpay_order_id: "o1", razorpay_payment_id: "p1", razorpay_subscription_id: "s1" }],
      []
    );
    expect(got.orderIds).toEqual(["o1"]);
    expect(got.paymentIds).toEqual(["p1"]);
    expect(got.subscriptionIds).toEqual(["s1"]);
  });

  it("gathers ids from checkout orders too", () => {
    const got = collectRazorpayIds([], [{ id: "POSHAN-abc123", razorpay_subscription_id: "s1" }]);
    expect(got.orderIds).toEqual(["POSHAN-abc123"]);
    expect(got.subscriptionIds).toEqual(["s1"]);
  });

  it("deduplicates a subscription id that appears in both tables", () => {
    const got = collectRazorpayIds(
      [{ razorpay_subscription_id: "s1" }],
      [{ razorpay_subscription_id: "s1" }]
    );
    expect(got.subscriptionIds).toEqual(["s1"]);
  });

  it("skips nulls without emitting empty ids", () => {
    /* An empty string in an `in (...)` clause matches nothing, but a null
       that slipped through as "" would widen the delete, not narrow it. */
    const got = collectRazorpayIds(
      [{ razorpay_order_id: null, razorpay_payment_id: undefined, razorpay_subscription_id: "s1" }],
      [{ id: null, razorpay_subscription_id: null }]
    );
    expect(got.orderIds).toEqual([]);
    expect(got.paymentIds).toEqual([]);
    expect(got.subscriptionIds).toEqual(["s1"]);
  });

  it("survives null inputs entirely", () => {
    const got = collectRazorpayIds(null, undefined);
    expect(got).toEqual({ orderIds: [], paymentIds: [], subscriptionIds: [] });
  });

  it("finds every id across several subscriptions", () => {
    /* A missed id is a payment record holding an email that nothing will
       ever point at again — unreachable, and therefore never erased. */
    const got = collectRazorpayIds(
      [
        { razorpay_order_id: "o1", razorpay_payment_id: "p1" },
        { razorpay_order_id: "o2", razorpay_payment_id: "p2" },
        { razorpay_subscription_id: "s1" },
      ],
      [{ id: "POSHAN-1" }, { id: "POSHAN-2", razorpay_subscription_id: "s2" }]
    );
    expect(got.orderIds.sort()).toEqual(["POSHAN-1", "POSHAN-2", "o1", "o2"].sort());
    expect(got.paymentIds.sort()).toEqual(["p1", "p2"]);
    expect(got.subscriptionIds.sort()).toEqual(["s1", "s2"]);
  });
});

describe("isDeleteConfirmed", () => {
  it("accepts the exact token", () => {
    expect(isDeleteConfirmed("DELETE")).toBe(true);
  });

  it("rejects anything else, including near misses", () => {
    expect(isDeleteConfirmed("delete")).toBe(false);
    expect(isDeleteConfirmed("Delete")).toBe(false);
    expect(isDeleteConfirmed(" DELETE ")).toBe(false);
    expect(isDeleteConfirmed(true)).toBe(false);
    expect(isDeleteConfirmed(1)).toBe(false);
    expect(isDeleteConfirmed(undefined)).toBe(false);
    expect(isDeleteConfirmed(null)).toBe(false);
  });
});
