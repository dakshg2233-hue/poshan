import { describe, it, expect } from "vitest";
import { dayOf, today, daysAgo, startOfTodayIso } from "./day";

/** A UTC instant for a given IST wall-clock time. IST is UTC+5:30. */
function atIst(y: number, m: number, d: number, hh: number, mm: number): Date {
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - 5.5 * 3600 * 1000);
}

describe("dayOf", () => {
  it("returns the IST day, not the UTC day, in the hours where they differ", () => {
    /* This is the whole bug: before 05:30 IST the UTC date is still
       yesterday, and every one of these used to be recorded as 18 Sept. */
    for (const [hh, mm] of [[0, 0], [0, 30], [2, 0], [5, 0], [5, 29]] as const) {
      expect(dayOf(atIst(2026, 9, 19, hh, mm))).toBe("2026-09-19");
    }
  });

  it("agrees with UTC for the rest of the day", () => {
    for (const [hh, mm] of [[5, 30], [9, 0], [13, 45], [23, 59]] as const) {
      const d = atIst(2026, 9, 19, hh, mm);
      expect(dayOf(d)).toBe("2026-09-19");
      expect(d.toISOString().slice(0, 10)).toBe("2026-09-19");
    }
  });

  it("rolls over at IST midnight, not UTC midnight", () => {
    expect(dayOf(atIst(2026, 9, 19, 23, 59))).toBe("2026-09-19");
    expect(dayOf(atIst(2026, 9, 20, 0, 1))).toBe("2026-09-20");
  });

  it("formats as YYYY-MM-DD, the shape the date columns use", () => {
    expect(dayOf(atIst(2026, 1, 5, 12, 0))).toBe("2026-01-05");
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("daysAgo", () => {
  it("counts back whole Indian days", () => {
    expect(daysAgo(0)).toBe(today());
    const seven = new Date(Date.now() - 7 * 86_400_000);
    expect(daysAgo(7)).toBe(dayOf(seven));
  });

  it("stays ordered and distinct", () => {
    const days = [0, 1, 2, 3].map(daysAgo);
    expect(new Set(days).size).toBe(4);
    expect([...days].sort().reverse()).toEqual(days);
  });
});

describe("startOfTodayIso", () => {
  it("is IST midnight, which is 18:30 UTC the day before", () => {
    expect(startOfTodayIso()).toMatch(/T18:30:00\.000Z$/);
  });

  it("is in the past and less than 24 hours ago", () => {
    const delta = Date.now() - new Date(startOfTodayIso()).getTime();
    expect(delta).toBeGreaterThanOrEqual(0);
    expect(delta).toBeLessThan(86_400_000);
  });
});
