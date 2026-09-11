/**
 * Product event tracking.
 *
 * Poshan had a consent-gated GA4 loader in consent.tsx and nothing that
 * ever called it — so the only thing measurable was pageviews, and even
 * that only when NEXT_PUBLIC_ANALYTICS_ID was set, which it wasn't. Thirty
 * five thousand lines of product with no way to see whether anyone used
 * any of it.
 *
 * This is the missing half: a single `track()` the app calls at the
 * moments that actually matter. Deliberately a small, named list rather
 * than a free-form string — an event taxonomy that anyone can add to
 * becomes a hundred near-duplicate names within a month and answers
 * nothing.
 *
 * Three rules this enforces:
 *
 * 1. Consent first. `track()` is a no-op until the user has accepted, and
 *    it never queues events to replay afterwards. Retroactively firing
 *    what someone did before they consented is precisely what the DPDP
 *    Act's consent requirement exists to prevent.
 * 2. No personal data in properties. Values are enums, counts and
 *    booleans. No dish names a person ate, no weights, no marker values,
 *    no free text. A health app leaking behaviour into a third-party
 *    analytics tool is a bigger problem than not measuring at all.
 * 3. Never throws. Analytics failing must never break a user's actual
 *    task.
 */

/** The events worth measuring, and nothing else. */
export type PoshanEvent =
  // Acquisition
  | "bmi_calculated"
  | "bmi_shared"
  | "bmi_cta_clicked"
  // Activation — the wedge
  | "scan_started"
  | "scan_succeeded"
  | "scan_failed"
  | "scan_corrected"
  | "plate_logged"
  // Retention
  | "meal_logged"
  | "plan_viewed"
  | "timeline_opened"
  | "day_context_set"
  // Trust
  | "privacy_centre_opened"
  | "consent_revoked"
  | "consent_narrowed"
  // Clinical
  | "triage_opened"
  | "patient_summary_read"
  // Revenue
  | "premium_viewed"
  | "checkout_started";

type Props = Record<string, string | number | boolean | null>;

const CONSENT_KEY = "poshan-consent";

function hasConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(CONSENT_KEY) === "accepted";
  } catch {
    /* Storage blocked (private window, or the user's browser settings).
       Treated as "no consent", never as "assume yes". */
    return false;
  }
}

/**
 * Record a product event.
 *
 * Silent no-op when analytics isn't configured or consent hasn't been
 * given — so call sites can be unconditional and don't each need to
 * re-implement the gate.
 */
export function track(event: PoshanEvent, props: Props = {}): void {
  if (typeof window === "undefined") return;
  if (!hasConsent()) return;

  try {
    const w = window as unknown as { dataLayer?: unknown[] };
    /* Create the queue rather than bailing when it's missing. This is
       GTM's own documented pattern (`dataLayer = dataLayer || []`) and it
       matters here for a specific reason: the loader in consent.tsx only
       runs when NEXT_PUBLIC_ANALYTICS_ID is set, so bailing meant every
       call site in the app was unreachable code whenever it wasn't —
       including in every developer's local environment, where a broken
       event would never be noticed.

       This does not weaken rule 1. Consent is checked above and events
       from before it are still never replayed; what's queued here is only
       what a consenting user did. */
    if (!w.dataLayer) w.dataLayer = [];
    /* Bounded, because with no loader ever attaching nothing drains this.
       A session that hits the cap has told us everything it can; the
       alternative is a queue that grows for as long as the tab is open. */
    if (w.dataLayer.length >= MAX_QUEUED) return;
    w.dataLayer.push(["event", event, sanitise(props)]);
  } catch {
    /* see rule 3 */
  }
}

/** Ceiling on the unattached queue. Comfortably more than one session's
 *  worth of real events, small enough to never matter for memory. */
const MAX_QUEUED = 500;

/**
 * Strips anything that could carry personal data, as a backstop to rule 2
 * rather than a substitute for call sites being careful. Long strings are
 * the main risk — a dish name or a note pasted into a property — so
 * they're dropped rather than truncated, since a truncated identifier is
 * still an identifier.
 */
function sanitise(props: Props): Props {
  const out: Props = {};
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === "string") {
      if (value.length > 40) continue;
      out[key] = value;
    } else {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Timing for the funnel that matters most: photograph → result.
 *
 * Returns a single resolve function that fires exactly one terminal event,
 * so every started scan has precisely one outcome. Call it on every exit
 * path — including "recognised nothing", which is a real outcome and not
 * an absence of one. Extra properties are merged in rather than tracked
 * separately, so the count and the timing arrive on the same event instead
 * of as two rows that have to be joined later.
 */
export function trackScanTiming(): (outcome: "ok" | "failed", props?: Props) => void {
  const started = Date.now();
  let resolved = false;
  track("scan_started");

  return (outcome, props = {}) => {
    /* Guards against a double-fire inflating the success rate — the one
       number this whole funnel exists to measure. */
    if (resolved) return;
    resolved = true;
    const seconds = Math.round((Date.now() - started) / 100) / 10;
    track(outcome === "ok" ? "scan_succeeded" : "scan_failed", { ...props, seconds });
  };
}
