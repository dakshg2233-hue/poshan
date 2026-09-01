"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLang } from "./lang-provider";
import type { Bi } from "@/lib/poshan-data";

/**
 * Tabs as the site's navigation.
 *
 * The page used to be one continuous scroll: every section stacked into a
 * single <main>, with the nav offering four anchor links into it. Finding the
 * meal library meant scrolling past the BMI tool, the bands and the plate.
 * Each tab now owns a group of sections and only the active group mounts.
 *
 * Why client state and not routes. The body profile (height, weight, goal,
 * diet, region) is held in PoshanAppInner and threaded into Hero, Meals,
 * MealLibrary and Premium alike. Splitting these across /plate, /meals and so
 * on would mean lifting all of it into a provider and re-reading it per route,
 * a far larger change than the navigation itself calls for.
 *
 * The URL still carries the tab. The hash is written on every change and read
 * back on load, so a tab is linkable, bookmarkable, survives reload, and the
 * browser back button steps through tabs the way it would through pages. The
 * old anchor links (#check, #plate, #bios, #premium) still resolve, because
 * each tab claims the section ids it contains.
 */

export type TabKey = "home" | "plate" | "meals" | "health" | "premium";

export type Tab = {
  key: TabKey;
  label: Bi;
  /** Section ids this tab owns, so old deep links still land somewhere. */
  owns: string[];
};

export const TABS: Tab[] = [
  {
    key: "home",
    label: { en: "Check your BMI", hi: "बीएमआई जाँचें" },
    owns: ["top", "hero", "check", "ht", "wt"],
  },
  {
    key: "plate",
    label: { en: "Your plate", hi: "आपकी थाली" },
    owns: ["plate", "thali-d", "thali-t", "thali-plate-fill"],
  },
  {
    key: "meals",
    label: { en: "Meals", hi: "भोजन" },
    owns: ["meals", "scan", "dish-search"],
  },
  {
    key: "health",
    label: { en: "Biomarkers", hi: "बायोमार्कर" },
    owns: ["bios", "conditions"],
  },
  {
    key: "premium",
    label: { en: "Poshan Home", hi: "पोषण घर" },
    owns: ["premium", "clinics", "cancel-details"],
  },
];

const DEFAULT_TAB: TabKey = "home";

/** Resolve a raw hash to a tab. Accepts both tab keys and owned section ids. */
export function tabFromHash(hash: string): TabKey | null {
  const id = hash.replace(/^#/, "").trim();
  if (!id) return null;
  const direct = TABS.find((t) => t.key === id);
  if (direct) return direct.key;
  const owner = TABS.find((t) => t.owns.includes(id));
  return owner ? owner.key : null;
}

type TabCtx = {
  active: TabKey;
  /** Switch tabs. `target` optionally scrolls to a section id once mounted. */
  go: (key: TabKey, target?: string) => void;
};

const Ctx = createContext<TabCtx | null>(null);

export function useTabs() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTabs must be used inside <TabProvider>");
  return ctx;
}

export function TabProvider({ children }: { children: React.ReactNode }) {
  /* Derived at init rather than corrected in an effect: seeding "home" and
     fixing it afterwards paints the wrong tab for a frame, and a setState in
     an effect body is what the React 19 compiler lint rejects. */
  const [active, setActive] = useState<TabKey>(() => {
    if (typeof window === "undefined") return DEFAULT_TAB;
    return tabFromHash(window.location.hash) ?? DEFAULT_TAB;
  });

  /* A section to scroll to after the new tab has mounted. Held in a ref so
     setting it never costs a render of its own. */
  const pending = useRef<string | null>(null);

  const go = useCallback((key: TabKey, target?: string) => {
    pending.current = target ?? null;
    setActive(key);
    const hash = `#${target ?? key}`;
    if (window.location.hash !== hash) {
      history.pushState(null, "", hash);
    }
    /* Every tab starts at its own top. Without this a tab entered from
       halfway down the previous one opens mid-section. */
    if (!target) window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  /* Back and forward move between tabs, because each switch pushed an entry. */
  useEffect(() => {
    const onPop = () => setActive(tabFromHash(window.location.hash) ?? DEFAULT_TAB);
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, []);

  /* Deep links into a section: the tab mounts first, then we scroll. */
  useEffect(() => {
    if (!pending.current) return;
    const id = pending.current;
    pending.current = null;
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [active]);

  const value = useMemo(() => ({ active, go }), [active, go]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * The tab strip.
 *
 * A real tablist, not a row of links: arrow keys move between tabs and apply
 * as they go, Home and End jump to the ends, and roving tabindex means Tab
 * enters and leaves the strip in one press rather than stepping through all
 * five. This is the same keyboard contract the palette control already uses.
 */
export function TabBar({ className = "" }: { className?: string }) {
  const { T } = useLang();
  const { active, go } = useTabs();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: React.KeyboardEvent, i: number) {
    const last = TABS.length - 1;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = i === last ? 0 : i + 1;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = i === 0 ? last : i - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next === null) return;
    e.preventDefault();
    go(TABS[next].key);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={T({ en: "Sections", hi: "अनुभाग" })}
      className={`flex gap-1 ${className}`}
    >
      {TABS.map((t, i) => {
        const on = active === t.key;
        return (
          <button
            key={t.key}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${t.key}`}
            aria-selected={on}
            aria-controls={`panel-${t.key}`}
            tabIndex={on ? 0 : -1}
            onClick={() => go(t.key)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className="rounded-full px-3.5 py-2 text-[0.9rem] font-semibold whitespace-nowrap cursor-pointer transition-colors"
            style={
              on
                ? { background: "var(--kesar-fill)", color: "#fff" }
                : { color: "var(--ink-soft)" }
            }
          >
            {T(t.label)}
          </button>
        );
      })}
    </div>
  );
}

/**
 * An anchor that switches tabs.
 *
 * Still a real <a> with a real href, so right-click, middle-click and
 * open-in-new-tab all behave, and the status bar shows a destination on
 * hover. Only a plain left click is intercepted, because the target section
 * may not be mounted and the browser's own hash jump would find nothing.
 */
export function TabLink({
  to,
  target,
  children,
  ...rest
}: {
  to: TabKey;
  /** Section to land on. Defaults to the tab's own top. */
  target?: string;
  children: React.ReactNode;
  /* Anything else an <a> takes, so data-magnetic and friends survive. */
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick">) {
  const { go } = useTabs();
  return (
    <a
      {...rest}
      href={`#${target ?? to}`}
      onClick={(e) => {
        /* Leave modified clicks to the browser. */
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        go(to, target);
      }}
    >
      {children}
    </a>
  );
}

/** Wraps one tab's sections. Only the active panel is in the document. */
export function TabPanel({
  tab,
  children,
}: {
  tab: TabKey;
  children: React.ReactNode;
}) {
  const { active } = useTabs();
  if (active !== tab) return null;
  return (
    /* key on the tab so React remounts the node on every switch: a CSS entry
       animation only runs on mount, and without the key React would reuse the
       element and the new panel would appear with no transition at all.
       There is no exit half deliberately - the outgoing panel is gone the
       moment state changes, and holding it on screen to animate out would
       delay the content the user just asked for. */
    <div
      key={tab}
      className="panel-in"
      role="tabpanel"
      id={`panel-${tab}`}
      aria-labelledby={`tab-${tab}`}
      tabIndex={-1}
    >
      {children}
    </div>
  );
}
