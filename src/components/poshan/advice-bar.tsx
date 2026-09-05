"use client";

import { useEffect, useState } from "react";
import { Stethoscope, X } from "lucide-react";
import { useLang } from "./lang-provider";
import { getTodaysAdvice, type DailyAdvice } from "@/lib/doctor-advice";

const DISMISS_KEY = "poshan-advice-dismissed-on";

function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Today's advice, rendered in normal document flow inside <Dashboard> —
 * the one place it's mounted, so there is nothing left to scope by tab or
 * pathname. It used to be fixed chrome pinned above the top nav (pushing the
 * nav down by its own measured height, via a ResizeObserver and a CSS var),
 * which is what let it paint over the nav on a tall line-wrap and, worse,
 * leak onto every tab once the tab system replaced routing — a pathname
 * check against a single-page app is always true. Now the nav stays fixed at
 * the true top of the viewport always, and this is just a card below it.
 *
 * Computed client-side only: today's advice is a pure function of the date,
 * but the server and a visitor's browser can disagree on what "today" is
 * near a midnight boundary, so this renders nothing until mounted rather
 * than risk a hydration mismatch over a decorative strip.
 */
export function AdviceBar() {
  const { T } = useLang();
  const [advice, setAdvice] = useState<DailyAdvice | null>(null);
  const [dismissed, setDismissed] = useState(true);

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

  if (!advice || dismissed) return null;

  /* Just the advice + source — the "Advice of the day" label is not part of
     this any more, it's a fixed prefix outside the scrolling track. */
  const scrolling = (
    <span className="ticker-item" style={{ color: "var(--ink)" }}>
      {T({ en: advice.en, hi: advice.hi })}
      {"  "}
      <span style={{ color: "var(--ink-soft)" }}>— {advice.source}</span>
    </span>
  );

  return (
    <div
      className="panel-in flex items-center gap-3 px-4 py-3 mb-8 rounded-2xl text-sm"
      style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
      role="note"
      aria-label={T({ en: "Doctor's advice of the day", hi: "आज की डॉक्टर की सलाह" })}
    >
      <Stethoscope
        className="h-4 w-4 shrink-0"
        style={{ color: "var(--kesar)" }}
        aria-hidden="true"
      />
      {/* Fixed, not part of the scroll: this label stays put while only the
          advice text moves past it. */}
      <span className="font-semibold shrink-0 whitespace-nowrap" style={{ color: "var(--ink)" }}>
        {T({ en: "Advice of the day:", hi: "आज की सलाह:" })}
      </span>
      {/* One line, always — the old wrap-and-ellipsis version cropped the
          text against this bar's fixed height instead of showing it in
          full. A ticker scrolls it through, seamlessly: two identical
          copies in a row, animated to exactly -50% of the track, so the
          moment the first copy exits, the second is sitting where the
          first began. Height and line-height are both pinned to the same
          value here — an auto-height row inside overflow:hidden can end up
          a pixel short of a font's actual line box, which is what was
          shaving the top off every line. */}
      <div
        className="ticker-viewport min-w-0 flex-1 overflow-x-hidden"
        style={{ height: "1.35rem", lineHeight: "1.35rem" }}
      >
        <div className="ticker-track inline-flex whitespace-nowrap">
          {scrolling}
          {/* Decorative repeat for the seamless loop, not a second message. */}
          <span aria-hidden="true">{scrolling}</span>
        </div>
      </div>
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
