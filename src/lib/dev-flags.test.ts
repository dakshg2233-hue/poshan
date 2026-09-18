import { describe, it, expect } from "vitest";
import { forcePremiumEnabled } from "./dev-flags";

/**
 * This flag gives away every paid gate in the product. The test that
 * matters is the one asserting production cannot turn it on, whatever the
 * environment says.
 */
describe("forcePremiumEnabled", () => {
  it("is off in production even when the env var explicitly asks for it", () => {
    expect(forcePremiumEnabled("production", "true")).toBe(false);
  });

  it("stays off in production for every other value too", () => {
    for (const v of ["TRUE", "1", "yes", "", undefined]) {
      expect(forcePremiumEnabled("production", v)).toBe(false);
    }
  });

  it("works in development, which is the only place it is meant to", () => {
    expect(forcePremiumEnabled("development", "true")).toBe(true);
    expect(forcePremiumEnabled("test", "true")).toBe(true);
  });

  it("is off outside production unless the value is exactly \"true\"", () => {
    for (const v of ["TRUE", "1", "yes", "false", "", undefined]) {
      expect(forcePremiumEnabled("development", v)).toBe(false);
    }
  });
});
