import { describe, it, expect } from "vitest";
import { bmiOf, dailyTargetKcal, effectiveWeightKg, estimateMaintenanceKcal } from "./energy-requirement";

/**
 * The calorie target is the number every plan in the app is built from.
 * These are the cases the 26 September 2026 audit found wrong: an obese
 * man told to eat 5,040 kcal to lose weight, and an underweight woman
 * allowed a deficit at BMI 12.5. Written as the failures, not the happy
 * path, because the happy path never broke.
 */

describe("effectiveWeightKg", () => {
  it("uses actual weight inside the healthy range", () => {
    expect(effectiveWeightKg(68, 172)).toBe(68);
  });

  it("counts a quarter of the weight above BMI 23", () => {
    // 175cm: BMI 23 is 70.44kg. 70.44 + 0.25 * (170 - 70.44) = 95.33
    expect(effectiveWeightKg(170, 175)).toBeCloseTo(95.33, 1);
  });

  it("is continuous at the overweight cutoff", () => {
    const atCutoff = 23 * 1.7 ** 2;
    expect(effectiveWeightKg(atCutoff + 0.001, 170)).toBeCloseTo(atCutoff, 2);
  });

  it("feeds an underweight person the weight at BMI 18.5", () => {
    // 155cm: BMI 18.5 is 44.45kg
    expect(effectiveWeightKg(30, 155)).toBeCloseTo(44.45, 1);
  });

  it("falls back to actual weight without a height", () => {
    expect(effectiveWeightKg(120, null)).toBe(120);
    expect(effectiveWeightKg(120, 0)).toBe(120);
  });
});

describe("estimateMaintenanceKcal", () => {
  it("no longer gives a severely obese man a five-thousand-calorie maintenance", () => {
    const kcal = estimateMaintenanceKcal(170, 45, "male", "sedentary", 175)!;
    expect(kcal).toBeLessThan(3200);
    expect(kcal).toBeGreaterThan(2600);
  });

  it("is unchanged for a healthy-weight adult", () => {
    // ICMR sedentary male 32 kcal/kg, 68kg
    expect(estimateMaintenanceKcal(68, 30, "male", "sedentary", 172)).toBe(2176);
  });

  it("still declines to estimate for anyone under 19", () => {
    expect(estimateMaintenanceKcal(55, 16, "male", "moderate", 165)).toBeNull();
  });
});

describe("dailyTargetKcal", () => {
  it("applies a deficit for a healthy weight", () => {
    expect(dailyTargetKcal(2200, -400, 22)).toBe(1800);
  });

  it("applies no deficit below BMI 18.5, whatever the goal", () => {
    expect(dailyTargetKcal(1333, -400, 12.5)).toBe(1333);
    expect(dailyTargetKcal(1333, -250, 17)).toBe(1333);
  });

  it("still allows a surplus below BMI 18.5", () => {
    expect(dailyTargetKcal(1333, 300, 17)).toBe(1633);
  });

  it("never turns a deficit into a surplus through the 1,200 floor", () => {
    // maintenance 1,100: the floor alone used to give 1,200 on "weight loss"
    expect(dailyTargetKcal(1100, -400, 20)).toBe(1100);
  });

  it("holds the 1,200 floor when maintenance is above it", () => {
    expect(dailyTargetKcal(1400, -400, 24)).toBe(1200);
  });

  it("works without a BMI, as before", () => {
    expect(dailyTargetKcal(2000, -400)).toBe(1600);
  });
});

describe("bmiOf", () => {
  it("returns null for a missing or impossible height", () => {
    expect(bmiOf(70, null)).toBeNull();
    expect(bmiOf(70, 0)).toBeNull();
    expect(bmiOf(0, 170)).toBeNull();
  });
});
