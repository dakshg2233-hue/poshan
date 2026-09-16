"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "./lang-provider";
import { AnchoredPanel } from "./anchored-panel";
import type { Bi } from "@/lib/poshan-data";

/**
 * Pick which sweet follows your pointer.
 *
 * Two things this deliberately does NOT do:
 *
 *  - Render on touch devices. There is no pointer to follow, so the cursor
 *    itself is disabled there; offering a picker for something invisible
 *    would just be a puzzle.
 *  - Render under prefers-reduced-motion. The cursor is motion, and someone
 *    who has asked for less of it should not be offered more.
 *
 * Selection is an attribute on <html>, matching how the palettes worked, so
 * nothing has to be threaded down to the cursor element.
 */

type FoodCursor = { key: string; name: Bi };

export const FOOD_CURSORS: FoodCursor[] = [
  { key: "ladoo", name: { en: "Ladoo", hi: "लड्डू" } },
  { key: "modak", name: { en: "Modak", hi: "मोदक" } },
  { key: "jalebi", name: { en: "Jalebi", hi: "जलेबी" } },
  { key: "gulab-jamun", name: { en: "Gulab jamun", hi: "गुलाब जामुन" } },
  { key: "barfi", name: { en: "Barfi", hi: "बर्फ़ी" } },
  { key: "rasgulla", name: { en: "Rasgulla", hi: "रसगुल्ला" } },
  { key: "apple", name: { en: "Apple", hi: "सेब" } },
  { key: "cucumber", name: { en: "Cucumber", hi: "खीरा" } },
  { key: "banana", name: { en: "Peeled banana", hi: "छिला केला" } },
  /* Plain discs, last. Not mithai: the way out for anyone who finds a
     sweet following the pointer distracting but still wants the cursor. */
  { key: "white", name: { en: "Plain white", hi: "सादा सफ़ेद" } },
  { key: "black", name: { en: "Plain black", hi: "सादा काला" } },
];

const STORAGE_KEY = "poshan-cursor";

export function CursorPicker() {
  const { T } = useLang();
  /* Derived at init, not set in an effect: a setState in an effect body
     cascades a render and the React 19 compiler lint rejects it. */
  const [hidden] = useState(
    () =>
      typeof window !== "undefined" &&
      (window.matchMedia("(hover: none)").matches ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  );
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [active, setActive] = useState("ladoo");
  const panelRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && FOOD_CURSORS.some((f) => f.key === saved)) apply(saved);
  }, []);

  /* Close on an outside click or Escape — this had neither, so the list
     stayed open until you picked something, which for a control you might
     have opened by accident is the one behaviour nobody expects. Both refs
     are checked because the panel is portalled to <body> and is not a
     descendant of the trigger's wrapper. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (toggleRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function apply(key: string) {
    setActive(key);
    localStorage.setItem(STORAGE_KEY, key);
    if (key === "ladoo") document.documentElement.removeAttribute("data-cursor");
    else document.documentElement.setAttribute("data-cursor", key);
  }

  if (hidden) return null;

  const current = FOOD_CURSORS.find((f) => f.key === active) ?? FOOD_CURSORS[0];

  return (
    /* Lives in <BottomBar> now, inline with the other icon controls, instead
       of floating independently over bottom-4 left-4. flex-col-reverse so the
       list still opens upward — anchored at the bottom of the viewport, a
       normally-ordered list would unroll straight off the bottom edge.
       hidden below lg: a food cursor is a mouse-pointer novelty, and on
       phone/tablet widths it was showing up as a dead icon anyway — the
       hover:none check above already catches touch-only devices, but a
       touch-capable laptop or a mouse-equipped tablet still has a hover
       pointer, so width is the more reliable "is this actually a desktop"
       signal here. */
    <div className="relative hidden lg:flex items-center print:hidden">
      <button
        ref={toggleRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={T({ en: "Cursor", hi: "कर्सर" }) + `: ${T(current.name)}`}
        /* Tokens rather than #fff, and an actual word — same two problems
           the palette control had when both moved up into the nav: a white
           glyph on a white hairline over a var(--roti) bar, unlabelled. */
        className="flex items-center gap-1.5 h-8 px-2 rounded-full cursor-pointer shrink-0 transition-colors hover:bg-[var(--roti-2)] focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ color: "var(--ink)", border: "1px solid var(--line)", outlineColor: "var(--kesar)" }}
        title={T({ en: "Cursor", hi: "कर्सर" })}
      >
        <span aria-hidden data-swatch={current.key} className="food-swatch block w-[16px] h-[16px] shrink-0" />
        <span className="hidden md:inline text-[0.74rem] font-semibold tracking-wide">
          {T({ en: "Cursor", hi: "कर्सर" })}
        </span>
      </button>

      <AnchoredPanel
        anchorRef={toggleRef}
        open={open}
        width={178}
        align="end"
        className="popover-in rounded-2xl p-2 shadow-2xl border"
        style={{
          background: "color-mix(in srgb, var(--roti) 96%, transparent)",
          borderColor: "var(--line)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        <ul
          ref={panelRef}
          className="grid gap-0.5 list-none p-0 m-0"
          role="radiogroup"
          aria-label={T({ en: "Choose a cursor", hi: "कर्सर चुनें" })}
        >
          {FOOD_CURSORS.map((f, i) => (
            <li key={f.key} className="card-in" style={{ "--i": i } as React.CSSProperties}>
              <button
                type="button"
                role="radio"
                aria-checked={active === f.key}
                onClick={() => {
                  apply(f.key);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[0.8rem] text-left cursor-pointer transition-colors"
                style={
                  active === f.key
                    ? { background: "var(--kesar-fill)", color: "#fff" }
                    : { color: "var(--ink-soft)" }
                }
              >
                {/* The same CSS that paints the cursor, at swatch size, so the
                    button shows the actual thing rather than a description. */}
                <span
                  aria-hidden
                  data-swatch={f.key}
                  className="food-swatch block w-4 h-4 shrink-0"
                />
                {T(f.name)}
              </button>
            </li>
          ))}
        </ul>
      </AnchoredPanel>
    </div>
  );
}
