/**
 * The site's absolute origin — one string, one place.
 *
 * Three separate files needed this (the root layout's `metadataBase`,
 * robots.txt and the sitemap) and each carried its own copy of the
 * fallback. They drifted the moment the domain was decided: all three
 * still said `poshan.app`, a domain registered to somebody else, so an
 * unset NEXT_PUBLIC_SITE_URL would have published a sitemap and OG cards
 * pointing at a stranger's site rather than simply failing.
 *
 * So the fallback is now the real production origin. Forgetting the env
 * var degrades to "correct in production, wrong on a preview URL" instead
 * of "confidently wrong everywhere" — and Next needs *some* value here,
 * since a relative URL in any metadata field with no `metadataBase` is a
 * build error, not a warning.
 *
 * Set NEXT_PUBLIC_SITE_URL anyway. Locally it wants http://localhost:3000
 * (.env.example already has that), and on Vercel it should be the
 * production domain on every environment.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://poshan.co.in"
).replace(/\/$/, "");
