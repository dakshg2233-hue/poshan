import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Agent worktrees. These hold whole checkouts of other repositories,
    // built `dist/` bundles included. Without this, `eslint` at the repo
    // root walks into them, Babel deoptimises on every file over 500KB,
    // and the run dies with a JS heap OOM after about twelve minutes —
    // so `npm run lint` did not fail, it crashed. The script is scoped to
    // `src` as well; this is the belt to that's braces, for anyone
    // running eslint directly.
    ".claude/**",
  ]),
]);

export default eslintConfig;
