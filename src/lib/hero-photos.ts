/**
 * The hero photograph's client-visible half.
 *
 * Only the fallback lives here, because this module is imported by
 * hero-video.tsx, which is a client component and cannot read the
 * filesystem. The actual list is discovered at build time on the server —
 * see hero-photos.server.ts.
 */

/**
 * Painted when the picker cannot run: JavaScript off, or a crawler. It is
 * a real file rather than a colour, so the page is never heroless.
 */
export const DEFAULT_HERO_PHOTO = "/hero/thali.jpg";

/** Where to drop new photographs. Referenced in the note in the folder. */
export const HERO_DIR = "public/hero";
