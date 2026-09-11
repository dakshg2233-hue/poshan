import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Tests cover the pure logic, deliberately — and only that.
 *
 * Poshan's risk is not that a button fails to render. It is that a rule
 * engine quietly returns the wrong answer about someone's health: a triage
 * band that misses a red flag, a portion that prescribes twice the food, a
 * safety gate that lets a dosing instruction through. Those five modules
 * are pure functions over plain data, they carry every clinical threshold
 * in the product, and they are exactly what a typecheck cannot verify —
 * `tsc` will happily confirm that a function returning the wrong number
 * returns a number.
 *
 * No jsdom, no component rendering, no mocked fetch. A component suite
 * here would be slower, far more brittle, and would test React rather than
 * Poshan. If it's added later it belongs in its own project entry.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
