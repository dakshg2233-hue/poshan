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
 */
const KEY = "poshan-consent";
const ANALYTICS_ID = process.env.NEXT_PUBLIC_ANALYTICS_ID;

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
  }

  /* "pending" is the pre-hydration state; a decision hides it for good. */
  if (choice !== null) return null;

  return (
    <div role="dialog" aria-label="Cookies"
      className="fixed inset-x-3 bottom-3 z-[120] mx-auto w-[min(46rem,100%-1.5rem)] rounded-2xl p-4 shadow-2xl sm:p-5"
      style={{ background: "var(--surface)", border: "1px solid var(--line)", color: "var(--ink)" }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <p className="text-[0.88rem] leading-relaxed">
          We&apos;d like to measure how the site is used. Nothing loads until you say yes,
          and declining changes nothing about how Poshan works.{" "}
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
