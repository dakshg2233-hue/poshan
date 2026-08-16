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
];

const STORAGE_KEY = "poshan-cursor";

export function CursorPicker() {
  const { T } = useLang();
  /* Derived at init, not set in an effect — a setState in an effect body
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
    /* Top-left, clear of the nav. Floating chrome rather than a footer row —
       a cursor picker 23,000px down the page is one nobody ever finds. */
    <div className="fixed top-20 left-4 z-[95] print:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-2 min-h-9 pl-2 pr-3.5 rounded-full text-[0.76rem] font-extrabold cursor-pointer shadow-lg"
        style={{ background: "var(--surface)", border: "1px solid var(--line)", color: "var(--ink)" }}
      >
        <span aria-hidden data-swatch={current.key} className="food-swatch block w-5 h-5 shrink-0" />
        {T({ en: "Cursor", hi: "कर्सर" })}
      </button>

      {open && (
        <ul
          className="mt-2 w-[178px] rounded-2xl p-2 shadow-2xl grid gap-0.5 list-none"
          style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
          role="radiogroup"
          aria-label={T({ en: "Choose a cursor", hi: "कर्सर चुनें" })}
        >
          {FOOD_CURSORS.map((f) => (
            <li key={f.key}>
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
