import { describe, it, expect } from "vitest";
import {
  BIOMARKERS,
  FREE_BIOMARKERS,
  canLogBiomarker,
  isBiomarkerKey,
  isPlausibleValue,
} from "./biomarkers";

describe("the list the pricing page sells", () => {
  it("has exactly four markers, because the page says 'all 4 biomarkers'", () => {
    expect(BIOMARKERS).toHaveLength(4);
  });

  it("free is exactly Vitamin D and HbA1c, the two the page names", () => {
    expect([...FREE_BIOMARKERS].sort()).toEqual(["hba1c", "vitamin_d"]);
  });
});

describe("canLogBiomarker", () => {
  it("lets a free account log the two free markers", () => {
    expect(canLogBiomarker("vitamin_d", false)).toBe(true);
    expect(canLogBiomarker("hba1c", false)).toBe(true);
  });

  it("holds the other two back from free accounts", () => {
    expect(canLogBiomarker("haemoglobin", false)).toBe(false);
    expect(canLogBiomarker("ldl", false)).toBe(false);
  });

  it("gives subscribers all four", () => {
    for (const m of BIOMARKERS) expect(canLogBiomarker(m.key, true)).toBe(true);
  });
});

describe("isBiomarkerKey", () => {
  it("accepts only the four", () => {
    for (const m of BIOMARKERS) expect(isBiomarkerKey(m.key)).toBe(true);
  });

  it("rejects anything else — the column is plain text with no constraint", () => {
    for (const v of ["creatinine", "", "HBA1C", null, undefined, 7, {}]) {
      expect(isBiomarkerKey(v)).toBe(false);
    }
  });
});

describe("isPlausibleValue", () => {
  it("accepts ordinary readings", () => {
    expect(isPlausibleValue("vitamin_d", 24)).toBe(true);
    expect(isPlausibleValue("hba1c", 6.4)).toBe(true);
    expect(isPlausibleValue("haemoglobin", 11.2)).toBe(true);
    expect(isPlausibleValue("ldl", 130)).toBe(true);
  });

  it("catches a slipped decimal, which is the whole point", () => {
    expect(isPlausibleValue("vitamin_d", 240)).toBe(false);
    expect(isPlausibleValue("hba1c", 64)).toBe(false);
  });

  it("rejects non-numbers and impossible values", () => {
    expect(isPlausibleValue("ldl", Number.NaN)).toBe(false);
    expect(isPlausibleValue("ldl", Infinity)).toBe(false);
    expect(isPlausibleValue("hba1c", -1)).toBe(false);
    expect(isPlausibleValue("hba1c", 0)).toBe(false);
  });
});
