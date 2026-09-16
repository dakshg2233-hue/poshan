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
 * Section navigation for a single continuous page.
 *
 * This has been round the loop twice, so the reasoning is worth keeping.
 * Originally the page was one long scroll with anchor links. That was
 * replaced by real tabs — one group of sections mounted at a time — because
 * reaching the meal library meant scrolling past the BMI tool, the bands
 * and the plate.
 *
 * Tabs solved that and introduced a worse problem: a visitor saw about a
 * sixth of Poshan and had no way to know the rest existed. On a marketing
 * page that is the expensive failure. Scrolling past a section you don't
 * need costs one flick; never discovering the clinician platform or the
 * conditions engine costs the customer.
 *
 * So: every section is mounted, all the time, and the tab strip drives
 * scrolling rather than mounting. The nav behaves identically to a user —
 * click "Biomarkers", land on biomarkers — but everything else is above
 * and below rather than discarded. A scroll-spy keeps the active pill
 * matched to what is on screen.
 *
 * Why client state and not routes. The body profile (height, weight, goal,
 * diet, region) is held in PoshanAppInner and threaded into Hero, Meals,
 * MealLibrary and Premium alike. Splitting these across /plate, /meals and so
 * on would mean lifting all of it into a provider and re-reading it per route,
 * a far larger change than the navigation itself calls for.
 *
 * The URL still carries the section. The hash is written on every click and
 * read back on load, so a section is linkable, bookmarkable and survives
 * reload, and back/forward step through the sections you clicked. Scrolling
 * deliberately does NOT write history — otherwise reading the page top to
 * bottom would bury the back button. The old anchor links (#check, #plate,
 * #bios, #premium) still resolve, because each tab claims the section ids it
 * contains.
 */

export type TabKey = "dashboard" | "home" | "yourmeals" | "scanner" | "health" | "premium";

export type Tab = {
  key: TabKey;
  label: Bi;
  /** Section ids this tab owns, so old deep links still land somewhere. */
  owns: string[];
  /** Reachable by hash/key but not rendered as a pill in <TabBar> — the
   * dashboard is a click-the-logo destination, not one of the utility tabs. */
  hidden?: boolean;
};

export const TABS: Tab[] = [
  {
    key: "dashboard",
    label: { en: "Home", hi: "होम" },
    owns: ["dashboard", "hero"],
    hidden: true,
  },
  {
    key: "home",
    label: { en: "Check your BMI", hi: "बीएमआई जाँचें" },
    owns: ["top", "check", "ht", "wt"],
  },
  {
    key: "scanner",
    label: { en: "Food Scanner", hi: "भोजन स्कैनर" },
    owns: ["scan", "build-your-plan"],
  },
  {
    key: "health",
    label: { en: "Biomarkers", hi: "बायोमार्कर" },
    owns: ["bios", "conditions"],
  },
  {
    key: "yourmeals",
    label: { en: "Your Meals", hi: "आपके भोजन" },
    owns: ["plate", "meals", "thali-d", "thali-t", "thali-plate-fill", "dish-search"],
  },
  {
    key: "premium",
    label: { en: "Poshan+", hi: "पोषण+" },
    owns: ["premium", "clinics", "cancel-details"],
  },
];

const DEFAULT_TAB: TabKey = "dashboard";

/** Height of the fixed nav, so a section never lands underneath it. */
const NAV_OFFSET = 62;

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

  const scrollToSection = useCallback((key: TabKey, target?: string) => {
    /* With one panel visible at a time, switching tabs means starting the
       new one from its top — not scrolling to an offset, because there is
       nothing above it any more. Only a deep link to a specific section
       inside the panel still needs measuring. */
    if (!target) {
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    const el = document.getElementById(target) || document.getElementById(`panel-${key}`);
    if (!el) return;

    const from = window.scrollY;
    const to = Math.max(0, el.getBoundingClientRect().top + from - NAV_OFFSET);
    if (Math.abs(to - from) < 2) return;

    window.scrollTo({ top: to, behavior: "smooth" });

    /* Smooth scrolling cannot be relied on here. Something in this page's
       motion stack (GSAP/framer/MotionLayer all listen on scroll) swallows
       programmatic smooth scrolls entirely — verified in the browser:
       scrollIntoView({behavior:"smooth"}) left scrollY at 0 while the same
       call with "auto" moved it 7,569px. Rather than track down which
       library and leave navigation hostage to it, this checks whether the
       scroll actually started and jumps outright if it didn't.
       Getting there instantly is worse than gliding; not getting there is
       broken. */
    window.setTimeout(() => {
      if (Math.abs(window.scrollY - from) < 2) {
        window.scrollTo({ top: to, behavior: "auto" });
      }
    }, 150);

  }, []);

  const go = useCallback(
    (key: TabKey, target?: string) => {
      setActive(key);
      const hash = `#${target ?? key}`;
      if (window.location.hash !== hash) {
        history.pushState(null, "", hash);
      }
      scrollToSection(key, target);
    },
    [scrollToSection]
  );

  /* Back and forward move between sections, because each click pushed an
     entry. Scrolls as well as highlights, so the button does what it looks
     like it does. */
  useEffect(() => {
    const onPop = () => {
      const key = tabFromHash(window.location.hash) ?? DEFAULT_TAB;
      setActive(key);
      scrollToSection(key);
    };
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, [scrollToSection]);

  /* Land on the right section when the page is opened at a hash.
     `active` is already seeded from the hash above, so the owning panel is
     the one on screen by the time this runs; a target inside it is
     therefore measurable. Two rAFs rather than one, because the panel
     switched from hidden to shown on the first of them and its children
     have no layout until the second. */
  useEffect(() => {
    const id = window.location.hash.replace(/^#/, "").trim();
    if (!id) return;
    const key = tabFromHash(window.location.hash);
    if (!key || id === key) return;
    requestAnimationFrame(() => requestAnimationFrame(() => scrollToSection(key, id)));
  }, [scrollToSection]);

  /* The scroll-spy that used to live here is gone.
     It walked every [data-tab-section] on scroll and set `active` to
     whichever had most recently passed under the nav — the right
     behaviour when all six panels were stacked in one document and the
     tab strip was really a set of scroll anchors. With one panel visible
     at a time there is only ever one section on screen, so it could only
     ever re-assert the tab that was already active, while fighting `go()`
     for ownership of that state. The `scrolling` ref and its 800ms
     stand-down timer existed solely to keep the two from arguing. */

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
const VISIBLE_TABS = TABS.filter((t) => !t.hidden);

export function TabBar({ className = "" }: { className?: string }) {
  const { T } = useLang();
  const { active, go } = useTabs();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: React.KeyboardEvent, i: number) {
    const last = VISIBLE_TABS.length - 1;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = i === last ? 0 : i + 1;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = i === 0 ? last : i - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next === null) return;
    e.preventDefault();
    go(VISIBLE_TABS[next].key);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={T({ en: "Sections", hi: "अनुभाग" })}
      className={`flex gap-1 ${className}`}
    >
      {VISIBLE_TABS.map((t, i) => {
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

/* useSwipeNav() lived here: swipe left/right to move between tabs.
 *
 * Removed with the move to one continuous page. A horizontal swipe that
 * jumps you to another part of a vertically-scrolling document is a
 * gesture nothing else on the web does — and now that the sections are
 * simply above and below each other, the gesture it replaces is just
 * scrolling, which phones already do very well.
 */


/**
 * One section of the page. Only the active one is shown.
 *
 * The history here is worth keeping, because this has now been both ways.
 * It started as a mount switch, was changed to always-mounted so a visitor
 * would not see "roughly a sixth of Poshan at a time and have to already
 * know the other five existed", and is now a switch again — but a different
 * one, which is what makes the earlier objection no longer apply.
 *
 * Always-mounted concatenated all six panels into a single 14,330px page:
 * 12.9 screens of everything at once, with the tab strip reduced to a set
 * of scroll anchors. That reads as a site talking over itself, and it is
 * the specific thing this change is fixing.
 *
 * Two details answer the discovery problem the old comment raised:
 *
 *  - `hidden`, not unmounted. The markup for all six panels stays in the
 *    document, so a crawler still sees every word of the product and the
 *    deep links in the footer still resolve. Only paint and layout are
 *    skipped.
 *  - The Dashboard tab — the one a visitor lands on — carries a card for
 *    each of the other five (see dashboard.tsx#LINKS). With the panels
 *    stacked, that grid was duplicating the tab strip directly above it.
 *    With one panel at a time it is doing the job the old comment was
 *    worried about: telling you the other five exist.
 *
 * `scroll-mt-[62px]` clears the fixed nav so a section scrolled to by hash
 * or click doesn't start underneath the bar.
 */
export function TabPanel({
  tab,
  children,
}: {
  tab: TabKey;
  children: React.ReactNode;
}) {
  const { active } = useTabs();
  const on = active === tab;

  return (
    <section
      id={`panel-${tab}`}
      data-tab-section={tab}
      className="scroll-mt-[62px]"
      /* role="tabpanel" is honest again. <TabBar> already renders real
         role="tab" buttons with aria-controls pointing here, so this
         completes a contract that was half-built while the panels were
         only scroll anchors. */
      role="tabpanel"
      aria-labelledby={`tab-${tab}`}
      /* The attribute, not a class: Tailwind's preflight carries
         [hidden]{display:none} and the attribute is also what assistive
         tech reads, so one declaration covers both. */
      hidden={!on}
    >
      {children}
    </section>
  );
}
