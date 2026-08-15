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

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span
        className="text-[0.68rem] font-extrabold uppercase"
        style={{ letterSpacing: "0.13em", color: "var(--ink-soft)" }}
      >
        {T({ en: "Your cursor", hi: "आपका कर्सर" })}
      </span>
      <ul className="flex flex-wrap gap-1.5 list-none p-0 m-0" role="radiogroup"
          aria-label={T({ en: "Choose a cursor", hi: "कर्सर चुनें" })}>
        {FOOD_CURSORS.map((f) => (
          <li key={f.key}>
            <button
              type="button"
              role="radio"
              aria-checked={active === f.key}
              onClick={() => apply(f.key)}
              title={T(f.name)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[0.74rem] cursor-pointer transition-colors"
              style={
                active === f.key
                  ? { background: "var(--kesar-fill)", color: "#fff", border: "1px solid var(--kesar-fill)" }
                  : { background: "var(--surface)", color: "var(--ink-soft)", border: "1px solid var(--line)" }
              }
            >
              {/* The same CSS that paints the cursor, at swatch size, so the
                  button shows the actual thing rather than a description. */}
              <span
                aria-hidden
                data-swatch={f.key}
                className="food-swatch block w-3.5 h-3.5 shrink-0"
              />
              {T(f.name)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
