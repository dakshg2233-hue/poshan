import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { track, trackScanTiming } from "./analytics";

/**
 * The three rules in analytics.ts are privacy promises, not preferences.
 *
 * Rule 1 (consent first) and rule 2 (no personal data in properties) are
 * the kind of thing that stays true until someone adds one convenient
 * property — a dish name, a weight, a marker value — and nothing anywhere
 * objects. These tests object.
 *
 * The module reads `window` and `localStorage` directly rather than taking
 * them as arguments, so the suite installs a minimal pair. That is cheaper
 * and more honest than jsdom here: what's under test is the gate, not the
 * DOM.
 */

type Stub = { store: Record<string, string>; dataLayer?: unknown[] };

function installBrowser(consent: "accepted" | "declined" | null): Stub {
  const store: Record<string, string> = {};
  if (consent) store["poshan-consent"] = consent;

  const g = globalThis as unknown as Record<string, unknown>;
  g.window = { localStorage: { getItem: (k: string) => store[k] ?? null } };
  g.localStorage = { getItem: (k: string) => store[k] ?? null };
  return { store };
}

function queue(): unknown[] {
  return ((globalThis as unknown as { window?: { dataLayer?: unknown[] } }).window?.dataLayer ??
    []) as unknown[];
}

function lastEvent(): [string, string, Record<string, unknown>] {
  const q = queue();
  return q[q.length - 1] as [string, string, Record<string, unknown>];
}

beforeEach(() => installBrowser("accepted"));

afterEach(() => {
  const g = globalThis as unknown as Record<string, unknown>;
  delete g.window;
  delete g.localStorage;
});

describe("rule 1 — consent first", () => {
  it("records nothing before consent is given", () => {
    installBrowser(null);
    track("bmi_calculated", { band: "overweight" });
    expect(queue()).toHaveLength(0);
  });

  it("records nothing when consent was declined", () => {
    installBrowser("declined");
    track("bmi_calculated", { band: "overweight" });
    expect(queue()).toHaveLength(0);
  });

  it("never replays what happened before consent", () => {
    /* The DPDP Act's consent requirement exists precisely to stop this:
       acting on data gathered before permission. A queue that flushed on
       acceptance would be the same violation with extra steps. */
    installBrowser(null);
    track("scan_started");
    track("plate_logged", { items: 3 });
    expect(queue()).toHaveLength(0);

    installBrowser("accepted");
    expect(queue()).toHaveLength(0);
  });

  it("records once consent is given", () => {
    track("timeline_opened", { events: 12 });
    expect(queue()).toHaveLength(1);
    const [kind, name, props] = lastEvent();
    expect(kind).toBe("event");
    expect(name).toBe("timeline_opened");
    expect(props).toEqual({ events: 12 });
  });
});

describe("rule 2 — no personal data in properties", () => {
  it("drops long strings, which is where a dish name or a note would hide", () => {
    track("meal_logged", {
      source: "scan",
      dish: "Aloo paratha with curd and pickle, extra ghee",
    });
    const [, , props] = lastEvent();
    expect(props.source).toBe("scan");
    expect(props.dish).toBeUndefined();
  });

  it("drops rather than truncates — a truncated identifier is an identifier", () => {
    const email = "someone.with.a.long.address@example.com and a note after it";
    track("meal_logged", { who: email });
    const [, , props] = lastEvent();
    expect(props.who).toBeUndefined();
    expect(JSON.stringify(props)).not.toContain("example.com");
  });

  it("keeps short enum-shaped values, which is what call sites are meant to send", () => {
    track("bmi_calculated", { band: "overweight", differs_from_western: true });
    const [, , props] = lastEvent();
    expect(props).toEqual({ band: "overweight", differs_from_western: true });
  });

  it("keeps numbers and booleans untouched", () => {
    track("triage_opened", { red: 3, amber: 11, green: 328 });
    const [, , props] = lastEvent();
    expect(props).toEqual({ red: 3, amber: 11, green: 328 });
  });
});

describe("rule 3 — never throws", () => {
  it("is a silent no-op with no window at all (server render)", () => {
    const g = globalThis as unknown as Record<string, unknown>;
    delete g.window;
    delete g.localStorage;
    expect(() => track("plan_viewed", { picks: 3 })).not.toThrow();
  });

  it("treats storage that throws as no consent, never as yes", () => {
    const g = globalThis as unknown as Record<string, unknown>;
    const boom = {
      getItem() {
        throw new Error("blocked");
      },
    };
    g.window = { localStorage: boom };
    g.localStorage = boom;
    expect(() => track("plan_viewed", { picks: 3 })).not.toThrow();
    expect(queue()).toHaveLength(0);
  });
});

describe("trackScanTiming", () => {
  it("fires exactly one terminal event per started scan", () => {
    const done = trackScanTiming();
    done("ok", { items: 4 });
    done("ok", { items: 4 }); // a double-fire must not inflate the success rate
    done("failed");

    const names = queue().map((e) => (e as string[])[1]);
    expect(names.filter((n) => n === "scan_started")).toHaveLength(1);
    expect(names.filter((n) => n === "scan_succeeded")).toHaveLength(1);
    expect(names.filter((n) => n === "scan_failed")).toHaveLength(0);
  });

  it("records a failure as a real outcome, not an absence of one", () => {
    const done = trackScanTiming();
    done("failed", { reason: "no_match" });
    const [, name, props] = lastEvent();
    expect(name).toBe("scan_failed");
    expect(props.reason).toBe("no_match");
    expect(typeof props.seconds).toBe("number");
  });

  it("puts the timing on the same event as the outcome", () => {
    const done = trackScanTiming();
    done("ok", { items: 2 });
    const [, , props] = lastEvent();
    expect(props.items).toBe(2);
    expect(props).toHaveProperty("seconds");
  });
});
