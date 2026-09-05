"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLang } from "./lang-provider";
import { useTabs, type TabKey } from "./tabs";
import { MEAL_LIBRARY, BIOMARKERS, type Bi } from "@/lib/poshan-data";
import { CONDITIONS } from "@/lib/conditions";

/**
 * Search across the whole site.
 *
 * Now that the sections live behind tabs, a visitor who knows the word they
 * want has no way to reach it by scrolling: the section holding it may not
 * even be mounted. This searches every dataset at once and, on pick, switches
 * to the owning tab and scrolls to the section, so a result is a destination
 * rather than a hint about where to look.
 *
 * Lives in <BottomBar> as a small always-visible input rather than an icon
 * that opens one — it used to be icon-only in the top nav, which meant a
 * whole extra tap before anyone could type. The results panel still opens as
 * a floating portal, just anchored above the bottom bar instead of below the
 * top one.
 *
 * The index is built once from the same constants the sections render, so
 * there is nothing to keep in sync. Both languages are always searched,
 * whichever is on screen, because people type Indian dish names in either
 * script and a Hindi speaker reading English copy still searches "दाल".
 */

type Hit = {
  id: string;
  title: Bi;
  detail: Bi;
  kind: Bi;
  tab: TabKey;
  target: string;
};

function buildIndex(): Hit[] {
  const meals: Hit[] = MEAL_LIBRARY.map((m) => ({
    id: `meal-${m.id}`,
    title: m.name,
    detail: m.note,
    kind: { en: "Meal", hi: "भोजन" },
    tab: "yourmeals",
    target: "meals",
  }));

  const conditions: Hit[] = CONDITIONS.map((c) => ({
    id: `cond-${c.key}`,
    title: c.name,
    detail: c.principle,
    kind: { en: "Condition", hi: "स्थिति" },
    tab: "health",
    target: "conditions",
  }));

  const biomarkers: Hit[] = BIOMARKERS.map((b) => ({
    id: `bio-${b.short}`,
    title: { en: b.short, hi: b.short },
    detail: b.why,
    kind: { en: "Biomarker", hi: "बायोमार्कर" },
    tab: "health",
    target: "bios",
  }));

  return [...meals, ...conditions, ...biomarkers];
}

/** Both languages, lowercased once, so matching never re-walks the objects. */
function haystack(h: Hit) {
  return `${h.title.en} ${h.title.hi} ${h.detail.en} ${h.detail.hi}`.toLowerCase();
}

export function SiteSearch() {
  const { T } = useLang();
  const { go } = useTabs();
  const [q, setQ] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const prepared = useMemo(
    () => buildIndex().map((h) => ({ hit: h, hay: haystack(h) })),
    []
  );

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    const scored = prepared
      .filter((p) => p.hay.includes(term))
      .map((p) => {
        const inTitle =
          p.hit.title.en.toLowerCase().includes(term) ||
          p.hit.title.hi.toLowerCase().includes(term);
        return { hit: p.hit, rank: inTitle ? 0 : 1 };
      });
    scored.sort((a, b) => a.rank - b.rank);
    return scored.slice(0, 8).map((s) => s.hit);
  }, [q, prepared]);

  const panelOpen = q.trim().length >= 2;

  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setQ("");
        inputRef.current?.blur();
      }
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const inToggle = rootRef.current?.contains(target);
      const inPanel = panelRef.current?.contains(target);
      if (!inToggle && !inPanel) setQ("");
    };
    addEventListener("keydown", onKey);
    addEventListener("mousedown", onClick);
    return () => {
      removeEventListener("keydown", onKey);
      removeEventListener("mousedown", onClick);
    };
  }, [panelOpen]);

  function pick(h: Hit) {
    go(h.tab, h.target);
    setQ("");
  }

  return (
    <div ref={rootRef} className="relative flex-1 min-w-0">
      <div className="relative flex items-center">
        <svg
          viewBox="0 0 20 20"
          aria-hidden
          className="absolute left-3 w-[15px] h-[15px] pointer-events-none"
          style={{ color: "#ffffffaa" }}
        >
          <circle cx={9} cy={9} r={6} fill="none" stroke="currentColor" strokeWidth={2} />
          <path d="M13.5 13.5 17.5 17.5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results.length) pick(results[0]);
          }}
          placeholder={T({ en: "Search meals, conditions…", hi: "भोजन, स्थितियाँ खोजें…" })}
          aria-label={T({ en: "Search the site", hi: "साइट खोजें" })}
          className="w-full pl-8 pr-3 min-h-9 rounded-full text-[0.84rem] outline-none"
          style={{
            background: "rgb(255 255 255 / .1)",
            border: "1px solid rgb(255 255 255 / .28)",
            color: "#fff",
          }}
        />
      </div>

      {/* Portalled to <body>: the bottom bar is .liquid-glass-chrome with
          overflow:hidden for its hairline and a backdrop-filter that makes it
          a containing block for fixed descendants, so a panel positioned
          from inside it never resolves against the viewport. Anchored above
          the bar (bottom, not top) since the trigger now lives at the very
          bottom of the screen. */}
      {panelOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            className="liquid-glass-chrome refract popover-in w-[min(23rem,calc(100vw-2rem))] rounded-2xl p-2.5 shadow-2xl"
            style={{
              position: "fixed",
              bottom: "calc(var(--bottom-bar-h, 64px) + 0.6rem)",
              left: "max(1rem, calc((100vw - 1180px) / 2 + 1rem))",
              zIndex: 130,
            }}
          >
            <ul className="grid gap-0.5 list-none max-h-[19rem] overflow-y-auto m-0 p-0">
              {results.length === 0 && (
                <li
                  className="px-3 py-3 text-[0.84rem]"
                  style={{ color: "var(--ink-soft)" }}
                >
                  {T({ en: "Nothing matches that.", hi: "कुछ मेल नहीं खाता।" })}
                </li>
              )}
              {results.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => pick(h)}
                    className="w-full text-left px-3 py-2.5 rounded-xl cursor-pointer transition-colors hover:bg-black/5"
                  >
                    <span
                      className="block text-[0.87rem] font-bold"
                      style={{ color: "var(--ink)" }}
                    >
                      {T(h.title)}
                    </span>
                    <span
                      className="block text-[0.75rem] mt-0.5"
                      style={{ color: "var(--ink-soft)" }}
                    >
                      {T(h.kind)} · {T(h.detail).slice(0, 62)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
}
