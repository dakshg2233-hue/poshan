"use client";

import { useState, useEffect } from "react";

/**
 * Live palette chooser, round two.
 *
 * Sindoor is what ships; these are alternatives to look at. All are built on
 * the near-white ground that replaced the old warm cream, since that lift is
 * what stopped the page reading dated — swapping only the accent family.
 *
 * This is a decision tool, not a product feature. Once a palette is chosen,
 * fold it into :root and delete this again. Shipping a colour picker to real
 * visitors would undercut having a point of view at all.
 */

export type PaletteKey =
  | "sindoor" | "seed" | "kaali" | "patta" | "neel" | "madhu" | "tulsi" | "kesari" | "kaajal" | "jamun";

export const PALETTES: {
  key: PaletteKey;
  name: string;
  note: string;
  swatch: [string, string, string];
}[] = [
  {
    key: "sindoor",
    name: "Sindoor",
    note: "Vermilion. What ships today — warmest and most appetising of the set.",
    swatch: ["#FDFBFA", "#C2410C", "#EEAA3C"],
  },
  {
    key: "seed",
    name: "Seed",
    note: "Botanical-clinical. Forest green as the only colour, lime confined to badges, whisper-light 300 headings — and it switches OFF every shadow, gradient and the ladoo, per the system's own rules.",
    swatch: ["#FCFCF7", "#1C3A13", "#D3FA99"],
  },
  {
    key: "kaali",
    name: "Kaali",
    note: "Matte black. Not #000 — pure black clips shadow detail on OLED and makes every border vanish. The only dark palette here, and the one glass looks best on.",
    swatch: ["#0E0E0E", "#FF8A5B", "#F0B055"],
  },
  {
    key: "patta",
    name: "Patta",
    note: "Charcoal and Poshan Leaf, from the Quiet Vitality spec. The only palette built on a light, new-growth green rather than a deep one — cool and clinical where the rest run warm.",
    swatch: ["#090A09", "#8FBF72", "#D8C98A"],
  },
  {
    key: "neel",
    name: "Neel",
    note: "Indigo — the dye India exported for centuries. Coolest and most clinical; the biomarker tables look most at home.",
    swatch: ["#FAFBFD", "#1E40AF", "#E0A52A"],
  },
  {
    key: "madhu",
    name: "Madhu",
    note: "Wine on warm white. The most expensive-looking, and the furthest from food.",
    swatch: ["#FDFAFB", "#9D2449", "#C79A5E"],
  },
  {
    key: "tulsi",
    name: "Tulsi",
    note: "Deep basil green. Reads healthy and calm, though green on a nutrition site is close to a cliché.",
    swatch: ["#FAFCFA", "#1F6B45", "#D9A52C"],
  },
  {
    key: "kesari",
    name: "Kesari",
    note: "Saffron with a teal counterweight. Warm like sindoor but with something cool to push against.",
    swatch: ["#FEFCF8", "#B45309", "#0F766E"],
  },
  {
    key: "kaajal",
    name: "Kaajal",
    note: "Near-monochrome with a single red accent. Lets photography do all the talking — strongest once you have more images.",
    swatch: ["#FBFBFB", "#B3311A", "#8A8A8A"],
  },
  {
    key: "jamun",
    name: "Jamun",
    note: "Deep plum. Distinctive and nobody in the category uses it — which is either an opportunity or a warning.",
    swatch: ["#FCFAFD", "#6B21A8", "#D9A52C"],
  },
];

const STORAGE_KEY = "poshan-palette";

export function PaletteSwitcher() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<PaletteKey>("sindoor");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as PaletteKey | null;
    if (saved && PALETTES.some((p) => p.key === saved)) apply(saved);
  }, []);

  function apply(k: PaletteKey) {
    setActive(k);
    localStorage.setItem(STORAGE_KEY, k);
    /* Sindoor is the base :root, so it is the absence of an attribute. */
    if (k === "sindoor") document.documentElement.removeAttribute("data-palette");
    else document.documentElement.setAttribute("data-palette", k);
  }

  return (
    <div className="fixed bottom-4 right-4 z-[100] print:hidden">
      {open && (
        <div
          className="liquid-glass-chrome refract mb-2 w-[300px] max-h-[70vh] overflow-y-auto rounded-2xl p-3 shadow-2xl"
        >
          <p
            className="text-[0.66rem] font-extrabold uppercase mb-2.5 px-1"
            style={{ letterSpacing: "0.13em", color: "var(--ink-soft)" }}
          >
            Try a palette
          </p>
          <ul className="grid gap-1 list-none p-0 m-0">
            {PALETTES.map((p) => (
              <li key={p.key}>
                <button
                  type="button"
                  aria-pressed={active === p.key}
                  onClick={() => apply(p.key)}
                  className="w-full text-left rounded-xl p-2.5 cursor-pointer transition-colors"
                  style={
                    active === p.key
                      ? { background: "var(--roti-2)", border: "1px solid var(--kesar)" }
                      : { border: "1px solid transparent" }
                  }
                >
                  <span className="flex items-center gap-2.5">
                    <span className="flex shrink-0 rounded-full overflow-hidden" aria-hidden>
                      {p.swatch.map((c) => (
                        <span
                          key={c}
                          className="block w-3.5 h-6"
                          style={{ background: c, boxShadow: "inset 0 0 0 1px rgb(0 0 0 / 0.08)" }}
                        />
                      ))}
                    </span>
                    <span className="text-[0.86rem] font-extrabold">{p.name}</span>
                  </span>
                  <span
                    className="block text-[0.72rem] mt-1 leading-snug"
                    style={{ color: "var(--ink-soft)" }}
                  >
                    {p.note}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="text-[0.68rem] mt-2 px-1" style={{ color: "var(--ink-soft)" }}>
            Dark mode still follows Sindoor — I&apos;ll build the dark variant for
            whichever you pick.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-2 min-h-11 px-4 rounded-full font-extrabold text-[0.82rem] cursor-pointer shadow-lg"
        style={{ background: "var(--ink)", color: "var(--roti)" }}
      >
        <span className="flex rounded-full overflow-hidden" aria-hidden>
          {(PALETTES.find((p) => p.key === active) ?? PALETTES[0]).swatch.map((c) => (
            <span key={c} className="block w-2.5 h-4" style={{ background: c }} />
          ))}
        </span>
        {open ? "Close" : "Palette"}
      </button>
    </div>
  );
}
