/**
 * Who is allowed to buy Poshan Plus.
 *
 * Poshan Home is ₹2499/year. Poshan Plus is ₹999/year for the same premium
 * gates minus multi-profile family. Until now the browser chose between
 * them by posting `product: "college"` and nothing checked anything, so the
 * ₹1500 difference was available to anyone who sent the cheaper string. The
 * SKU says "College & Hostellers" on the page; this is the first thing that
 * makes that mean something.
 *
 * The check is the academic domain of the signed-in account's own email,
 * read server-side from the Supabase session — never from the request body,
 * which is the whole point.
 *
 * ── Off by default, and that is the decision, not an oversight ───────────
 * Plenty of real Indian students have no college address at all and sign up
 * with Gmail. Gating on an academic domain turns those students away, which
 * is a worse failure than letting some non-students in at ₹999: it refuses
 * money from exactly the people the SKU exists for, on launch day, silently.
 * Poshan runs student pricing on the honour system — the same way Spotify
 * and Apple ran theirs for years before buying verification.
 *
 * So the check is opt-IN:
 *
 *   COLLEGE_VERIFICATION=on                           turn the check on
 *   COLLEGE_EMAIL_DOMAINS=snu.edu.in,ashoka.edu.in    extra domains for it
 *
 * The default is deliberately the permissive one. An env var whose absence
 * produces the behaviour you did not want is a trap: forget it on one
 * environment and the gate quietly closes on paying students. This way
 * forgetting it changes nothing, and turning the gate on is an explicit act
 * in one place.
 */

/** Suffix match, so `students.iitm.ac.in` passes on `.ac.in` without listing it. */
const ACADEMIC_SUFFIXES = [".ac.in", ".edu.in", ".edu", ".ac.uk"];

/**
 * On switch. Only the literal "on" enables the check — unset, blank, "off"
 * or a typo all leave student pricing open, which is the intended default.
 *
 * Read per call rather than captured at module load: this decides who is
 * charged what, so it has to be testable without reloading the module, and
 * an operator flipping it should not need a redeploy to take effect.
 */
export function collegeVerificationOn(): boolean {
  return process.env.COLLEGE_VERIFICATION === "on";
}

function extraDomains(): string[] {
  return (process.env.COLLEGE_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
}

/**
 * True if this address belongs to an institution. Case-insensitive, and
 * tolerant of the address being absent — an account with no email cannot
 * prove anything, so it fails closed.
 */
export function isCollegeEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  const domain = email.slice(at + 1).toLowerCase().trim();
  if (!domain) return false;

  if (ACADEMIC_SUFFIXES.some((suffix) => domain === suffix.slice(1) || domain.endsWith(suffix))) {
    return true;
  }
  /* An explicitly listed domain matches itself or any subdomain of itself,
     so one entry covers a college that puts students on a subdomain. */
  return extraDomains().some((d) => domain === d || domain.endsWith(`.${d}`));
}

/** Gate off (the default), or a genuine academic address. */
export function canBuyCollegePlan(email: string | null | undefined): boolean {
  return !collegeVerificationOn() || isCollegeEmail(email);
}
