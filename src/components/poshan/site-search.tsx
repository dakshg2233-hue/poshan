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
    tab: "meals",
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
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Built once. The datasets are module constants, so there is nothing for
     this to depend on and nothing that can invalidate it. */
  const prepared = useMemo(
    () => buildIndex().map((h) => ({ hit: h, hay: haystack(h) })),
    []
  );

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    /* Title matches first: someone typing "dal" wants the dal, not every
       plan whose note happens to mention it. */
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

  /* Escape closes and returns focus to the field; a click outside closes
     without stealing it. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setQ("");
      }
    };
    /* Both subtrees count as inside. The panel is portalled to <body>, so it
       is not a descendant of rootRef: testing rootRef alone would read a
       click on a result as a click outside and close before it lands. */
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const inToggle = rootRef.current?.contains(target);
      const inPanel = panelRef.current?.contains(target);
      if (!inToggle && !inPanel) setOpen(false);
    };
    addEventListener("keydown", onKey);
    addEventListener("mousedown", onClick);
    return () => {
      removeEventListener("keydown", onKey);
      removeEventListener("mousedown", onClick);
    };
  }, [open]);

  function pick(h: Hit) {
    go(h.tab, h.target);
    setOpen(false);
    setQ("");
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-label={T({ en: "Search the site", hi: "साइट खोजें" })}
        onClick={() => {
          setOpen((o) => !o);
          /* Focus after the field exists, not in the same tick. */
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className="flex items-center justify-center w-9 h-9 rounded-full cursor-pointer transition-colors hover:bg-white/10"
        style={{ color: "#ffffffcc" }}
      >
        <svg viewBox="0 0 20 20" aria-hidden className="w-[18px] h-[18px]">
          <circle cx={9} cy={9} r={6} fill="none" stroke="currentColor" strokeWidth={2} />
          <path d="M13.5 13.5 17.5 17.5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
        </svg>
      </button>

      {/* Portalled to <body>, and it has to be.
        *
        * The bar is .liquid-glass-chrome: overflow:hidden for its hairline,
        * which clips an absolutely positioned panel to the bar's 67px, and
        * backdrop-filter for the glass, which makes the bar a containing
        * block for fixed descendants. That second one is the killer. Inside
        * the header, position:fixed resolves against the header rather than
        * the viewport, so the panel computed top:68.8px and still painted at
        * 6px, over the tabs. No positioning fixes that from within; the panel
        * has to leave the subtree.
        *
        * The document check is not decoration. This component is prerendered
        * on the server, where there is no document at all, and React throws
        * "Target container is not a DOM element" the moment createPortal is
        * reached with anything that is not an element. Guarding on `open`
        * alone is not enough to keep the server off this branch. */}
      {open &&
        typeof document !== "undefined" &&
        createPortal(
        <div
          ref={panelRef}
          className="liquid-glass-chrome refract popover-in w-[min(23rem,calc(100vw-2rem))] rounded-2xl p-2.5 shadow-2xl"
          style={{
            position: "fixed",
            top: "4.3rem",
            right: "max(1.25rem, calc((100vw - 1180px) / 2))",
            zIndex: 130,
          }}
        >
          <input
            ref={inputRef}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results.length) pick(results[0]);
            }}
            placeholder={T({
              en: "Search meals, conditions, biomarkers",
              hi: "भोजन, स्थितियाँ, बायोमार्कर खोजें",
            })}
            aria-label={T({ en: "Search", hi: "खोजें" })}
            className="w-full px-3.5 min-h-10 rounded-xl text-[0.88rem] outline-none"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              color: "var(--ink)",
            }}
          />

          {q.trim().length >= 2 && (
            <ul className="mt-2 grid gap-0.5 list-none max-h-[19rem] overflow-y-auto">
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
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
