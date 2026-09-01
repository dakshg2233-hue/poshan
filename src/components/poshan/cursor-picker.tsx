"use client";

import { useEffect, useState } from "react";
import { useLang } from "./lang-provider";
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
  const [active, setActive] = useState("ladoo");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && FOOD_CURSORS.some((f) => f.key === saved)) apply(saved);
  }, []);

  function apply(key: string) {
    setActive(key);
    localStorage.setItem(STORAGE_KEY, key);
    if (key === "ladoo") document.documentElement.removeAttribute("data-cursor");
    else document.documentElement.setAttribute("data-cursor", key);
  }

  if (hidden) return null;

  const current = FOOD_CURSORS.find((f) => f.key === active) ?? FOOD_CURSORS[0];

  return (
    /* Bottom-left: floating chrome, but out of the composition. Top-left put
       the chip directly under the logo, which is why this was taken off the
       page rather than moved. Down here it mirrors the palette control in the
       opposite corner, and the mobile sticky CTA that also lives at the bottom
       is no conflict: this never renders on touch. */
    /* flex-col-reverse so the list opens upward. Anchored at the bottom, a
       normally-ordered list would unroll straight off the viewport. */
    <div className="fixed bottom-4 left-4 z-[95] flex flex-col-reverse items-start print:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="liquid-glass-chrome refract flex items-center gap-2 min-h-9 pl-2 pr-3.5 rounded-full text-[0.76rem] font-extrabold cursor-pointer shadow-lg"
        /* No opaque background here, .liquid-glass-chrome supplies a
           translucent one, and an opaque inline fill would leave nothing
           for the blur to show through. */
        style={{ color: "var(--ink)" }}
      >
        <span aria-hidden data-swatch={current.key} className="food-swatch block w-5 h-5 shrink-0" />
        {T({ en: "Cursor", hi: "कर्सर" })}
      </button>

      {open && (
        <ul
          className="liquid-glass-chrome refract popover-in popover-bl mb-2 w-[178px] rounded-2xl p-2 shadow-2xl grid gap-0.5 list-none"
          role="radiogroup"
          aria-label={T({ en: "Choose a cursor", hi: "कर्सर चुनें" })}
        >
          {FOOD_CURSORS.map((f, i) => (
            <li key={f.key} className="card-in" style={{ "--i": i } as React.CSSProperties}>
              <button
                type="button"
                role="radio"
                aria-checked={active === f.key}
                onClick={() => apply(f.key)}
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
      )}
    </div>
  );
}
