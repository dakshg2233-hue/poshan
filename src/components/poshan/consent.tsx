"use client";

import { useEffect, useState } from "react";

/**
 * Cookie banner, and the gate that analytics sits behind.
 *
 * Written consent-first rather than banner-first: nothing is loaded, and no
 * identifier is set, until someone accepts. A banner that appears after the
 * tracking has already started is theatre, and under the DPDP Act and GDPR it
 * is also not consent.
 *
 * ANALYTICS_ID is read from env. With no id configured this component still
 * works: it simply has nothing to load, which is the correct behaviour for a
 * site that has not chosen a provider yet.
 *
 * The decision is now written twice, and both copies matter for different
 * reasons. localStorage is what stops the banner reappearing on every page
 * — a per-device convenience. consent_records is the evidence: DPDP puts
 * the burden of demonstrating consent on the Fiduciary, and a key in the
 * visitor's own browser, which they can clear and which never reaches the
 * server, demonstrates nothing to anybody. The server write is best-effort
 * precisely because the local one is not: if the network fails, the
 * visitor's choice is still honoured, and the missing row is a gap in our
 * evidence rather than a broken experience for them.
 */
const KEY = "poshan-consent";
/** Ties an anonymous visitor's rows together before they have an account. */
const ANON_KEY = "poshan-anon-id";
const ANALYTICS_ID = process.env.NEXT_PUBLIC_ANALYTICS_ID;

/**
 * Loads Google Analytics, and only ever after consent.
 *
 * This used to be blocked in production and nobody had noticed: the CSP in
 * next.config.ts allowed scripts only from 'self' and Razorpay, so the
 * browser refused the tag manager outright. Poshan spent that whole period
 * asking people to consent to measurement that could not happen. It failed
 * in the private direction, which is why it was invisible — no errors
 * anyone saw, no data collected, just a cookie banner doing nothing.
 *
 * Resolved in favour of making the feature work rather than deleting it,
 * because the measurement is wanted (see the note at the top of
 * analytics.ts) and the gate around it is already honest: nothing loads
 * before consent, IP is anonymised, ad signals are off, and no personal
 * data is ever put in an event property.
 *
 * Two CSP entries hold this up, and both are needed. script-src allows
 * googletagmanager.com, which is where this file loads gtag from.
 * connect-src allows google-analytics.com, which is where gtag then sends
 * events — a different domain, so allowing only the first would load the
 * script successfully and then silently drop everything it measured.
 */
function loadAnalytics() {
  if (!ANALYTICS_ID || document.getElementById("poshan-analytics")) return;
  const s = document.createElement("script");
  s.id = "poshan-analytics";
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_ID}`;
  document.head.appendChild(s);
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  function gtag(...args: unknown[]) { w.dataLayer!.push(args); }
  gtag("js", new Date());
  /* IP anonymised, and no ad signals: this measures usage, not people. */
  gtag("config", ANALYTICS_ID, { anonymize_ip: true, allow_google_signals: false });
}

/**
 * A random id for an unauthenticated visitor, so their accept and their
 * later withdrawal are recognisably the same person's decisions.
 *
 * Deliberately not derived from anything about them — no fingerprint, no
 * IP hash. It is a coin flip stored locally, which is the least
 * identifying thing that can still link two rows, and it is only ever
 * created for someone who is about to have a consent row either way.
 */
function anonId(): string | null {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    /* Blocked storage: the decision still applies to this page view, it
       just cannot be linked to a later one. */
    return null;
  }
}

/**
 * Record a cookie decision in the server-side ledger.
 *
 * Exported because the Privacy Centre's withdrawal toggle has to write the
 * identical row — s.6(4) requires withdrawal to be as easy as giving, and
 * two code paths that write consent differently is how one of them ends up
 * being the easy one.
 */
export async function recordCookieConsent(granted: boolean, lang: "en" | "hi" = "en") {
  try {
    await fetch("/api/privacy/consents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        purpose: "analytics_cookies",
        granted,
        lang,
        anonId: anonId(),
      }),
      keepalive: true,
    });
  } catch {
    /* Best effort by design — see the note at the top of the file. */
  }
}

/** Stop analytics for the rest of this page view, without a reload. */
export function unloadAnalytics() {
  try {
    document.getElementById("poshan-analytics")?.remove();
    const w = window as unknown as { [k: string]: unknown };
    if (ANALYTICS_ID) {
      /* The documented kill switch: gtag reads this before every send, so
         setting it stops the collection that has already been configured.
         Removing the script alone would not — the loaded code stays
         resident until the page is discarded. */
      w[`ga-disable-${ANALYTICS_ID}`] = true;
    }
  } catch {
    /* Nothing to undo. */
  }
}

export function Consent() {
  const [choice, setChoice] = useState<string | null>("pending");

  useEffect(() => {
    const t = setTimeout(() => {
      let saved: string | null = null;
      try { saved = localStorage.getItem(KEY); } catch { /* blocked storage */ }
      setChoice(saved);
      if (saved === "accepted") loadAnalytics();
    }, 0);
    return () => clearTimeout(t);
  }, []);

  function decide(value: "accepted" | "declined") {
    try { localStorage.setItem(KEY, value); } catch { /* blocked storage */ }
    setChoice(value);
    if (value === "accepted") loadAnalytics();
    void recordCookieConsent(value === "accepted");
  }

  /* "pending" is the pre-hydration state; a decision hides it for good. */
  if (choice !== null) return null;

  return (
    <div role="dialog" aria-label="Cookies"
      className="consent-in fixed inset-x-3 z-[120] mx-auto w-[min(46rem,100%-1.5rem)] rounded-2xl p-4 shadow-2xl sm:p-5"
      style={{ background: "var(--surface)", border: "1px solid var(--line)", color: "var(--ink)", bottom: "calc(var(--bottom-bar-h, 64px) + 0.75rem)" }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <p className="text-[0.88rem] leading-relaxed">
          We&apos;d like to measure how the site is used. Nothing loads until you say yes,
          and declining changes nothing about how Poshan works. You can change your
          mind later in the{" "}
          <a href="/privacy-centre" className="underline" style={{ color: "var(--kesar)" }}>
            Privacy centre
          </a>
          .{" "}
          <a href="/privacy" className="underline" style={{ color: "var(--kesar)" }}>Privacy</a>
        </p>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => decide("declined")}
            className="min-h-11 rounded-full px-4 text-[0.84rem] font-semibold"
            style={{ border: "1.5px solid var(--line)", color: "var(--ink)" }}>
            Decline
          </button>
          <button type="button" onClick={() => decide("accepted")}
            className="min-h-11 rounded-full px-4 text-[0.84rem] font-semibold"
            style={{ background: "var(--kesar-fill)", color: "#fff" }}>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
