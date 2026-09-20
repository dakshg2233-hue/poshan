import { describe, it, expect } from "vitest";
import {
  ageFromDob,
  isMinor,
  mustWithholdTracking,
  isConsentPurpose,
  MINOR_AGE,
  NOTICE_VERSION,
  NOTICE_ITEMS,
  PROCESSORS,
} from "./dpdp";

/**
 * The age gate decides whether DPDP s.9 applies, and s.9 is the section
 * with a ₹200 crore ceiling attached. Every branch of it is tested,
 * including the ones that look too obvious to be worth a case — an off-by-
 * one here is not a cosmetic bug, it is processing a child's data without
 * the consent the Act requires.
 */

/* Fixed so the suite does not start failing on somebody's birthday. */
const NOW = new Date("2026-09-20T12:00:00Z");

describe("ageFromDob", () => {
  it("counts whole years", () => {
    expect(ageFromDob("2000-09-20", NOW)).toBe(26);
    expect(ageFromDob("1990-01-01", NOW)).toBe(36);
  });

  it("does not round up before the birthday has happened", () => {
    /* One day short of 18. The single most consequential case in the file:
       getting this wrong lets a child through the gate a day early. */
    expect(ageFromDob("2008-09-21", NOW)).toBe(17);
    expect(ageFromDob("2008-09-20", NOW)).toBe(18);
  });

  it("handles a birthday earlier this month", () => {
    expect(ageFromDob("2008-09-01", NOW)).toBe(18);
  });

  it("handles a birthday later this year", () => {
    expect(ageFromDob("2008-12-31", NOW)).toBe(17);
  });

  it("handles 29 February without drifting", () => {
    /* The reason this is not (now - dob) / 365.25. A leap-day child born
       in 2008 is 18 by 20 September 2026 on any reading. */
    expect(ageFromDob("2008-02-29", NOW)).toBe(18);
  });

  it("returns null for a date in the future rather than a negative age", () => {
    expect(ageFromDob("2030-01-01", NOW)).toBeNull();
  });

  it("returns null for unparseable input", () => {
    expect(ageFromDob("not a date", NOW)).toBeNull();
    expect(ageFromDob("", NOW)).toBeNull();
  });
});

describe("isMinor", () => {
  it("prefers date of birth over the stale age integer", () => {
    /* The whole reason date_of_birth was added: `age` is captured once at
       onboarding and never ages. Where they disagree, the date wins. */
    expect(isMinor({ dateOfBirth: "1990-01-01", age: 15 })).toBe(false);
    expect(isMinor({ dateOfBirth: "2015-01-01", age: 40 })).toBe(true);
  });

  it("falls back to age when no date of birth is stored", () => {
    expect(isMinor({ age: 17 })).toBe(true);
    expect(isMinor({ age: 18 })).toBe(false);
    expect(isMinor({ age: MINOR_AGE })).toBe(false);
  });

  it("falls back to age when the date of birth is unusable", () => {
    expect(isMinor({ dateOfBirth: "garbage", age: 12 })).toBe(true);
  });

  it("returns null — not false — when age is simply unknown", () => {
    /* "We never asked" must stay distinguishable from "they are an adult".
       Collapsing the two is how an ungated account slips through. */
    expect(isMinor({})).toBeNull();
    expect(isMinor({ dateOfBirth: null, age: null })).toBeNull();
  });

  it("treats a 0-year-old as a minor", () => {
    /* family_members.age starts at 0, and 0 is falsy — the exact shape of
       bug that a truthiness check would introduce here. */
    expect(isMinor({ age: 0 })).toBe(true);
  });
});

describe("mustWithholdTracking", () => {
  it("withholds from a child", () => {
    expect(mustWithholdTracking({ age: 10 })).toBe(true);
    expect(mustWithholdTracking({ dateOfBirth: "2012-05-01" })).toBe(true);
  });

  it("allows an adult", () => {
    expect(mustWithholdTracking({ age: 30 })).toBe(false);
    expect(mustWithholdTracking({ dateOfBirth: "1995-05-01" })).toBe(false);
  });

  it("fails closed when age is unknown", () => {
    /* The one place unknown resolves to the restrictive answer. An adult
       loses a streak until they fill in a birthday; the alternative is
       showing a child a leaderboard, which s.9(3) forbids outright. */
    expect(mustWithholdTracking({})).toBe(true);
    expect(mustWithholdTracking({ age: null, dateOfBirth: null })).toBe(true);
  });
});

describe("consent purposes", () => {
  it("accepts the known purposes", () => {
    expect(isConsentPurpose("analytics_cookies")).toBe(true);
    expect(isConsentPurpose("account_and_health_data")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isConsentPurpose("everything")).toBe(false);
    expect(isConsentPurpose("")).toBe(false);
    expect(isConsentPurpose(null)).toBe(false);
    expect(isConsentPurpose(42)).toBe(false);
  });
});

describe("the notice", () => {
  it("has a version that consent rows can pin", () => {
    expect(NOTICE_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
  });

  it("states a purpose for every category of data — s.5(1)", () => {
    expect(NOTICE_ITEMS.length).toBeGreaterThan(0);
    for (const item of NOTICE_ITEMS) {
      expect(item.what.en.trim()).not.toBe("");
      expect(item.why.en.trim()).not.toBe("");
    }
  });

  it("is available in Hindi as well as English — s.5(3)", () => {
    /* Not a style preference: the Act requires the notice be available in
       English or a Schedule language, and a half-translated notice is one
       a Hindi reader cannot rely on. */
    for (const item of NOTICE_ITEMS) {
      expect(item.what.hi.trim()).not.toBe("");
      expect(item.why.hi.trim()).not.toBe("");
    }
    for (const p of PROCESSORS) {
      expect(p.does.hi.trim()).not.toBe("");
      expect(p.where.hi.trim()).not.toBe("");
    }
  });

  it("names where each processor is, so s.16 transfers are disclosed", () => {
    for (const p of PROCESSORS) {
      expect(p.name.trim()).not.toBe("");
      expect(p.where.en.trim()).not.toBe("");
    }
    /* The three that matter: if any of these stops being listed, a
       cross-border disclosure has gone missing from the policy. */
    const names = PROCESSORS.map((p) => p.name);
    expect(names).toContain("Anthropic");
    expect(names).toContain("OpenAI");
    expect(names).toContain("Supabase");
  });
});
