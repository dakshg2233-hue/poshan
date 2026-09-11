import { describe, it, expect } from "vitest";
import { triagePatient, computeAdherence, type TriageInput } from "./triage";

/**
 * These tests are about the thresholds, not the plumbing.
 *
 * Every number asserted here is a published clinical cutoff that triage.ts
 * cites in its own comments — ADA/ICMR for HbA1c, KDIGO for eGFR, WHO for
 * haemoglobin. Pinning them in a test is the point: a refactor that shifts
 * "HbA1c ≥ 8.0 is red" to 8.5 typechecks perfectly and changes which
 * patients a doctor looks at first. That is the failure this file exists
 * to catch.
 */

const QUIET: TriageInput = {
  labs: [],
  adherence: null,
  daysSinceLastLog: null,
  planUnopened: false,
  daysSincePlanApproved: null,
};

const lab = (marker: string, value: number, taken_on = "2026-09-01") =>
  ({ marker, value, taken_on }) as TriageInput["labs"][number];

describe("triagePatient — bands", () => {
  it("is green when there is nothing to say", () => {
    const r = triagePatient(QUIET);
    expect(r.band).toBe("green");
    expect(r.signals).toHaveLength(0);
  });

  it("never invents a signal from absent data", () => {
    /* null means "not measured", and must not read as zero adherence or a
       patient who has gone silent — both of which are red. */
    const r = triagePatient({ ...QUIET, adherence: null, daysSinceLastLog: null });
    expect(r.band).toBe("green");
  });

  describe("HbA1c", () => {
    it("≥ 8.0 is red — poor control by ICMR management guidance", () => {
      const r = triagePatient({ ...QUIET, labs: [lab("hba1c", 8.0)] });
      expect(r.band).toBe("red");
      expect(r.signals[0].text).toContain("poorly controlled");
      expect(r.signals[0].source).toBe("lab");
    });

    it("6.5–7.9 is amber — over the diagnostic threshold, not a crisis", () => {
      expect(triagePatient({ ...QUIET, labs: [lab("hba1c", 6.5)] }).band).toBe("amber");
      expect(triagePatient({ ...QUIET, labs: [lab("hba1c", 7.9)] }).band).toBe("amber");
    });

    it("5.7–6.4 is amber, and says prediabetic rather than diabetic", () => {
      const r = triagePatient({ ...QUIET, labs: [lab("hba1c", 6.0)] });
      expect(r.band).toBe("amber");
      expect(r.signals[0].text).toContain("prediabetic");
    });

    it("below 5.7 produces nothing at all", () => {
      expect(triagePatient({ ...QUIET, labs: [lab("hba1c", 5.6)] }).band).toBe("green");
    });
  });

  describe("other markers", () => {
    it("eGFR < 30 is red (KDIGO G4), 30–59 amber, ≥ 60 silent", () => {
      expect(triagePatient({ ...QUIET, labs: [lab("egfr", 29)] }).band).toBe("red");
      expect(triagePatient({ ...QUIET, labs: [lab("egfr", 45)] }).band).toBe("amber");
      expect(triagePatient({ ...QUIET, labs: [lab("egfr", 60)] }).band).toBe("green");
    });

    it("haemoglobin < 8 is red (WHO severe anaemia), < 11 amber", () => {
      expect(triagePatient({ ...QUIET, labs: [lab("haemoglobin", 7.9)] }).band).toBe("red");
      expect(triagePatient({ ...QUIET, labs: [lab("haemoglobin", 10)] }).band).toBe("amber");
      expect(triagePatient({ ...QUIET, labs: [lab("haemoglobin", 13)] }).band).toBe("green");
    });

    it("LDL ≥ 190 is red, ≥ 160 amber", () => {
      expect(triagePatient({ ...QUIET, labs: [lab("ldl", 190)] }).band).toBe("red");
      expect(triagePatient({ ...QUIET, labs: [lab("ldl", 160)] }).band).toBe("amber");
      expect(triagePatient({ ...QUIET, labs: [lab("ldl", 159)] }).band).toBe("green");
    });
  });

  it("reads only the most recent value per marker", () => {
    /* A patient whose HbA1c was 9.2 in January and 5.4 last week is not a
       red patient. Banding on the worst historical value would keep them
       at the top of a doctor's list forever. */
    const r = triagePatient({
      ...QUIET,
      labs: [lab("hba1c", 9.2, "2026-01-10"), lab("hba1c", 5.4, "2026-09-01")],
    });
    expect(r.band).toBe("green");
  });

  it("does not care what order the history arrives in", () => {
    const r = triagePatient({
      ...QUIET,
      labs: [lab("hba1c", 5.4, "2026-09-01"), lab("hba1c", 9.2, "2026-01-10")],
    });
    expect(r.band).toBe("green");
  });
});

describe("triagePatient — behaviour signals", () => {
  it("21 days silent is red, 10 is amber, 9 is neither", () => {
    expect(triagePatient({ ...QUIET, daysSinceLastLog: 21 }).band).toBe("red");
    expect(triagePatient({ ...QUIET, daysSinceLastLog: 10 }).band).toBe("amber");
    expect(triagePatient({ ...QUIET, daysSinceLastLog: 9 }).band).toBe("green");
  });

  it("adherence below 30% is red, below 60% amber", () => {
    expect(triagePatient({ ...QUIET, adherence: 0.29 }).band).toBe("red");
    expect(triagePatient({ ...QUIET, adherence: 0.5 }).band).toBe("amber");
    expect(triagePatient({ ...QUIET, adherence: 0.6 }).band).toBe("green");
  });

  it("states adherence as a whole percentage the doctor can check", () => {
    const r = triagePatient({ ...QUIET, adherence: 0.42 });
    expect(r.signals[0].text).toBe("Following 42% of the plan");
  });

  it("flags a plan unopened for a week, but not one approved yesterday", () => {
    expect(
      triagePatient({ ...QUIET, planUnopened: true, daysSincePlanApproved: 7 }).band
    ).toBe("amber");
    expect(
      triagePatient({ ...QUIET, planUnopened: true, daysSincePlanApproved: 1 }).band
    ).toBe("green");
  });

  it("does not flag an opened plan however old it is", () => {
    expect(
      triagePatient({ ...QUIET, planUnopened: false, daysSincePlanApproved: 90 }).band
    ).toBe("green");
  });
});

describe("triagePatient — ordering", () => {
  it("puts a red reason first, whatever order it was computed in", () => {
    /* The row shows signals[0]. A doctor scanning the list must see the
       worst reason, not whichever rule happened to run first — labs are
       evaluated before inactivity, so an amber lab would otherwise mask a
       red silence. */
    const r = triagePatient({
      ...QUIET,
      labs: [lab("hba1c", 6.0)], // amber
      daysSinceLastLog: 30, // red
    });
    expect(r.band).toBe("red");
    expect(r.signals[0].band).toBe("red");
  });

  it("keeps every reason, not just the worst", () => {
    const r = triagePatient({
      ...QUIET,
      labs: [lab("hba1c", 8.5), lab("ldl", 165)],
      adherence: 0.2,
    });
    expect(r.signals).toHaveLength(3);
    expect(r.band).toBe("red");
  });
});

describe("computeAdherence", () => {
  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

  it("returns null for an empty window rather than zero", () => {
    /* Zero is a claim about the patient; null is the truth about the data.
       A new patient shown as 0% adherent would be triaged red for having
       just signed up. */
    expect(computeAdherence([], 0)).toBeNull();
    expect(computeAdherence([], 7, daysAgo(1))).toBeNull();
  });

  it("measures against three meals a day", () => {
    /* 7 days × 3 = 21 slots; 21 logs is a full plan followed. */
    const logs = Array.from({ length: 21 }, (_, i) => daysAgo(i % 7));
    expect(computeAdherence(logs, 7)).toBeCloseTo(1, 2);
  });

  it("reads two meals a day as roughly two thirds, not as complete", () => {
    const logs = Array.from({ length: 14 }, (_, i) => daysAgo(i % 7));
    const a = computeAdherence(logs, 7);
    expect(a).toBeGreaterThan(0.6);
    expect(a).toBeLessThan(0.72);
  });

  it("never exceeds 1, however much a patient logs", () => {
    const logs = Array.from({ length: 200 }, () => daysAgo(1));
    expect(computeAdherence(logs, 7)).toBe(1);
  });

  it("ignores logs from before the window", () => {
    expect(computeAdherence([daysAgo(90), daysAgo(60)], 7)).toBe(0);
  });

  it("measures a mid-window joiner only against the days they were a patient", () => {
    /* Joined 5 days ago, logged 3 meals a day since: that is full
       adherence, not 5/21 of it. */
    const logs = Array.from({ length: 15 }, (_, i) => daysAgo(i % 5));
    const a = computeAdherence(logs, 30, new Date(Date.now() - 5 * 86_400_000).toISOString());
    expect(a).toBeGreaterThan(0.9);
  });
});
