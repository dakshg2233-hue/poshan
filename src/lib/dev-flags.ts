/** Set NEXT_PUBLIC_FORCE_PREMIUM=true in .env.local to test Poshan Home
 * features without a real subscriptions row (mobile app QA). Never set in
 * production — this is gated behind an env var that .env.local (gitignored)
 * is the only place setting it. */
export const FORCE_PREMIUM = process.env.NEXT_PUBLIC_FORCE_PREMIUM === "true";

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
