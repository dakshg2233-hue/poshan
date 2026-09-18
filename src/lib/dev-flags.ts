/**
 * Set NEXT_PUBLIC_FORCE_PREMIUM=true in .env.local to test Poshan Home
 * features without a real subscriptions row (mobile app QA).
 *
 * This flag hands out every paid gate for free — the dashboard, meals,
 * onboarding, family, invites and the clinician check all read it — so
 * setting it in production gives the entire product away to every visitor.
 *
 * It used to be protected by an argument rather than by code: "the only
 * place that sets it is .env.local, which is gitignored." That held while
 * a local file was the only place env vars lived. It stopped holding the
 * moment this app got deployed, because a hosting dashboard is also a
 * place env vars live, and gitignore has no authority there. The real
 * .env.local on this machine does say `true`, so copying it wholesale
 * into a host — the obvious way to set up a new deploy — is all it would
 * have taken.
 *
 * So the production build now refuses it outright. NODE_ENV is inlined at
 * build time on both the server and the client, which means this folds to
 * a constant `false` in any production bundle no matter what the env var
 * says. Local `npm run dev` is unaffected and QA keeps its tool.
 */
export function forcePremiumEnabled(
  nodeEnv: string | undefined,
  flag: string | undefined
): boolean {
  return nodeEnv !== "production" && flag === "true";
}

export const FORCE_PREMIUM = forcePremiumEnabled(
  process.env.NODE_ENV,
  process.env.NEXT_PUBLIC_FORCE_PREMIUM
);

/**
 * App-wide kill switch for the gamification layer (streaks-with-grace,
 * badges, household/public leaderboards) — set
 * NEXT_PUBLIC_GAMIFICATION_ENABLED=false to hide all of it instantly if
 * it isn't working out, with no code change and no redeploy of anything
 * beyond this one env var. Defaults to on. A per-user
 * profiles.gamification_enabled toggle sits alongside this for someone
 * who personally wants it off without affecting anyone else — this flag
 * is the "turn it off for everyone" lever, that one is "turn it off for
 * me."
 */
export const GAMIFICATION_ENABLED = process.env.NEXT_PUBLIC_GAMIFICATION_ENABLED !== "false";
