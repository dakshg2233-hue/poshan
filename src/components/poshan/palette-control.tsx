"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "./lang-provider";
import { PALETTES, type PaletteKey } from "./palette-switcher";

/**
 * The palette chooser, as fixed chrome rather than nav furniture.
 *
 * It used to live inside <header>. The header stows itself while the
 * full-height hero holds the top of the frame, which took the only palette
 * control off screen with it — at the top of the page there was no way to
 * change the colours at all, and you had to scroll a whole viewport to find
 * one. Mounted here it is reachable everywhere, including over the hero.
 *
 * Keyboard and screen-reader behaviour, none of which the nav version had:
 *
 *  - The list is a real radiogroup: Up/Down/Left/Right move between palettes
 *    and apply as they go, so the page previews under the cursor. Home/End
 *    jump to the ends.
 *  - Roving tabindex, so Tab enters and leaves the group in one press rather
 *    than stepping through all nine.
 *  - Escape closes and returns focus to the toggle; a click outside closes
 *    without stealing focus.
 *  - The change is announced in a live region, because for a screen-reader
 *    user the entire effect of this control is otherwise invisible.
 */
const STORAGE_KEY = "poshan-palette";

function applyPalette(key: PaletteKey) {
  /* Sindoor is the bare :root, so it is the absence of the attribute. */
  if (key === "sindoor") document.documentElement.removeAttribute("data-palette");
  else document.documentElement.setAttribute("data-palette", key);
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {
    /* Blocked storage: the palette still applies for this visit. */
  }
}

export function PaletteControl() {
  const { T } = useLang();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<PaletteKey>("sindoor");
  const [announce, setAnnounce] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /* Adopt whatever is already applied, so the tick matches the page. */
  useEffect(() => {
    const t = setTimeout(() => {
      const saved = localStorage.getItem(STORAGE_KEY) as PaletteKey | null;
      const attr = document.documentElement.getAttribute("data-palette") as PaletteKey | null;
      const found = attr ?? saved;
      if (found && PALETTES.some((p) => p.key === found)) {
        setActive(found);
        applyPalette(found);
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  /* Close on outside click and on Escape. Escape also restores focus; an
     outside click deliberately does not, since focus has moved on already. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
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

  /* Move focus into the checked option when the list opens. */
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      listRef.current
        ?.querySelector<HTMLButtonElement>('[role="radio"][aria-checked="true"]')
        ?.focus();
    }, 0);
    return () => clearTimeout(t);
  }, [open]);

  function choose(key: PaletteKey, keepOpen = false) {
    setActive(key);
    applyPalette(key);
    const name = PALETTES.find((p) => p.key === key)?.name ?? key;
    setAnnounce(T({ en: `${name} palette applied`, hi: `${name} रंग लागू` }));
    if (!keepOpen) {
      setOpen(false);
      toggleRef.current?.focus();
    }
  }

  function onListKeyDown(e: React.KeyboardEvent) {
    const i = PALETTES.findIndex((p) => p.key === active);
    let next = -1;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = (i + 1) % PALETTES.length;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft")
      next = (i - 1 + PALETTES.length) % PALETTES.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = PALETTES.length - 1;
    if (next < 0) return;
    e.preventDefault();
    /* Applies as it moves, so the page previews under the cursor. */
    choose(PALETTES[next].key, true);
    const btns = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    btns?.[next]?.focus();
  }

  const current = PALETTES.find((p) => p.key === active) ?? PALETTES[0];

  return (
    <div ref={rootRef} className="fixed bottom-4 right-4 z-[100] print:hidden">
      {/* Announces the change; visually hidden, never removed from the DOM so
          screen readers reliably pick up the update. */}
      <span aria-live="polite" className="sr-only">
        {announce}
      </span>

      {open && (
        <div
          ref={listRef}
          role="radiogroup"
          aria-label={T({ en: "Colour palette", hi: "रंग पट्टिका" })}
          onKeyDown={onListKeyDown}
          className="mb-2 w-[268px] max-h-[68vh] overflow-y-auto rounded-2xl p-2 shadow-2xl border"
          style={{
            background: "color-mix(in srgb, var(--roti) 94%, transparent)",
            borderColor: "var(--line)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          {PALETTES.map((p) => {
            const checked = p.key === active;
            return (
              <button
                key={p.key}
                type="button"
                role="radio"
                aria-checked={checked}
                /* Roving tabindex: Tab enters the group once, arrows move
                   within it. Nine tab stops here would be tedious. */
                tabIndex={checked ? 0 : -1}
                onClick={() => choose(p.key)}
                className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  background: checked ? "var(--roti-2)" : "transparent",
                  border: checked ? "1px solid var(--kesar)" : "1px solid transparent",
                  color: "var(--ink)",
                  outlineColor: "var(--kesar)",
                }}
              >
                <span className="flex shrink-0 rounded-full overflow-hidden" aria-hidden>
                  {p.swatch.map((c) => (
                    <span
                      key={c}
                      className="block w-3 h-6"
                      style={{ background: c, boxShadow: "inset 0 0 0 1px rgb(0 0 0 / 0.10)" }}
                    />
                  ))}
                </span>
                <span className="text-[0.86rem] font-extrabold">{p.name}</span>
                {checked && (
                  <span className="ml-auto text-[0.7rem]" style={{ color: "var(--kesar)" }}>
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <button
        ref={toggleRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={T({
          en: `Change colour palette. Current: ${current.name}`,
          hi: `रंग बदलें। अभी: ${current.name}`,
        })}
        className="flex items-center gap-2 min-h-11 px-4 rounded-full font-extrabold text-[0.82rem] cursor-pointer shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          background: "var(--ink)",
          color: "var(--roti)",
          outlineColor: "var(--kesar)",
        }}
      >
        <span className="flex rounded-full overflow-hidden" aria-hidden>
          {current.swatch.map((c) => (
            <span key={c} className="block w-2.5 h-4" style={{ background: c }} />
          ))}
        </span>
        {T({ en: "Colours", hi: "रंग" })}
      </button>
    </div>
  );
}
