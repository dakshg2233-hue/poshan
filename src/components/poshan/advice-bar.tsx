"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Stethoscope, X } from "lucide-react";
import { useLang } from "./lang-provider";
import { getTodaysAdvice, type DailyAdvice } from "@/lib/doctor-advice";

const DISMISS_KEY = "poshan-advice-dismissed-on";

function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Scoped to the hero page only (pathname === "/"), not every route this
 * layout wraps. Was previously a blacklist ("show everywhere except
 * /dashboard"), which meant it also showed on /login, /faq, /contact and
 * every /clinician page — anywhere but the one page it was actually meant
 * for. Narrowed to an allowlist instead: TodayWidget already surfaces the
 * same advice inside its own card on /dashboard, and none of the other
 * pages it was leaking onto were ever the intended surface either.
 *
 * Computed client-side only: today's advice is a pure function of the date,
 * but the server and a visitor's browser can disagree on what "today" is
 * near a midnight boundary, so this renders nothing until mounted rather
 * than risk a hydration mismatch over a decorative strip.
 */
export function AdviceBar() {
  const { T } = useLang();
  const pathname = usePathname();
  const [advice, setAdvice] = useState<DailyAdvice | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const barRef = useRef<HTMLDivElement>(null);
  const isHeroPage = pathname === "/";

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setAdvice(getTodaysAdvice());
      setDismissed(
        typeof window !== "undefined" &&
          window.localStorage.getItem(DISMISS_KEY) === todayKey()
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /* The main site's nav is `position: fixed; top: var(--advice-bar-h, 0px)`
     (src/app/globals.css, .nav-slide) so it shifts down instead of painting
     over this bar — fixed elements ignore document order entirely, so
     merely rendering above the nav in JSX does nothing on its own. Measured
     rather than hardcoded because the text wraps to a second line below
     ~480px wide, changing the bar's real height. Cleared on dismiss/unmount
     so the nav snaps back to top:0 the moment the bar is gone. */
  useEffect(() => {
    const root = document.documentElement;
    if (!advice || dismissed || !isHeroPage) {
      root.style.removeProperty("--advice-bar-h");
      return;
    }
    const el = barRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      root.style.setProperty("--advice-bar-h", `${entry.contentRect.height}px`);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--advice-bar-h");
    };
  }, [advice, dismissed, isHeroPage]);

  if (!advice || dismissed || !isHeroPage) return null;

  return (
    <div
      ref={barRef}
      className="panel-in flex items-center gap-3 px-4 py-2.5 text-sm"
      style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)" }}
      role="note"
      aria-label={T({ en: "Doctor's advice of the day", hi: "आज की डॉक्टर की सलाह" })}
    >
      <Stethoscope
        className="h-4 w-4 shrink-0"
        style={{ color: "var(--kesar)" }}
        aria-hidden="true"
      />
      {/* A bar means one line: the full advice + source can run past 200
          characters, which wraps to three lines at typical widths and stops
          being a bar. Truncated with an ellipsis and the full text on
          hover/long-press via title, same trade a stock ticker makes. */}
      <p
        className="min-w-0 flex-1 truncate"
        style={{ color: "var(--ink)" }}
        title={`${T({ en: advice.en, hi: advice.hi })} — ${advice.source}`}
      >
        <span className="font-semibold">
          {T({ en: "Advice of the day: ", hi: "आज की सलाह: " })}
        </span>
        {T({ en: advice.en, hi: advice.hi })}{" "}
        <span style={{ color: "var(--ink-soft)" }}>— {advice.source}</span>
      </p>
      <button
        type="button"
        onClick={() => {
          window.localStorage.setItem(DISMISS_KEY, todayKey());
          setDismissed(true);
        }}
        aria-label={T({ en: "Dismiss for today", hi: "आज के लिए बंद करें" })}
        className="shrink-0 rounded-full p-1 transition-colors hover:opacity-70"
        style={{ color: "var(--ink-soft)" }}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
