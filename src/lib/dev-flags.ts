/** Set NEXT_PUBLIC_FORCE_PREMIUM=true in .env.local to test Poshan Home
 * features without a real subscriptions row (mobile app QA). Never set in
 * production — this is gated behind an env var that .env.local (gitignored)
 * is the only place setting it. */
export const FORCE_PREMIUM = process.env.NEXT_PUBLIC_FORCE_PREMIUM === "true";
