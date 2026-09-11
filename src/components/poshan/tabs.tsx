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

  /* Set while a click-driven scroll is in flight. The scroll-spy below has
     to stand down for its duration: a smooth scroll from the last section
     to the first crosses every section on the way, and letting the spy
     react would drag the highlight backwards through all of them before
     settling. */
  const scrolling = useRef(false);

  const scrollToSection = useCallback((key: TabKey, target?: string) => {
    const el =
      (target && document.getElementById(target)) ||
      document.getElementById(`panel-${key}`);
    if (!el) return;

    const from = window.scrollY;
    const to = Math.max(0, el.getBoundingClientRect().top + from - NAV_OFFSET);
    if (Math.abs(to - from) < 2) return;

    scrolling.current = true;
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

    /* No scrollend event in Safari yet, so releasing the spy is
       time-based. Long enough to cover a full-page scroll, short enough
       that the spy is live again before anyone reads the next section. */
    window.setTimeout(() => {
      scrolling.current = false;
    }, 800);
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

  /* Land on the right section when the page is opened at a hash. Runs once,
     after mount, because the target has to exist before it can be scrolled
     to — and with every section now mounted, it always will. */
  useEffect(() => {
    const id = window.location.hash.replace(/^#/, "").trim();
    if (!id) return;
    const key = tabFromHash(window.location.hash);
    if (!key) return;
    /* rAF rather than a bare call: fonts and images are still settling on
       first paint and a scroll measured now lands short. */
    requestAnimationFrame(() => scrollToSection(key, id !== key ? id : undefined));
  }, [scrollToSection]);

  /* Scroll-spy: keeps the nav pill matched to whatever is actually on
     screen. Deliberately does NOT touch history — only a click does that,
     so reading the page top to bottom doesn't bury the back button under
     fifty entries.

     A plain rAF-throttled scroll listener rather than an
     IntersectionObserver. IO is the usual tool and would be the right one
     for hundreds of targets, but there are six, a rect read on six
     elements per frame is free, and this version has no dependency on
     observer callbacks firing — which are suspended in some embedded and
     backgrounded contexts, where the nav would silently stop tracking. */
  useEffect(() => {
    let raf = 0;

    const measure = () => {
      raf = 0;
      if (scrolling.current) return;

      const sections = document.querySelectorAll<HTMLElement>("[data-tab-section]");
      if (sections.length === 0) return;

      /* The current section is the last one whose top has passed just
         under the nav — i.e. the one you have scrolled into most recently.
         Falls back to the first, so the top of the page reads as section
         one rather than as nothing. */
      let current: TabKey | null = null;
      for (const s of sections) {
        if (s.getBoundingClientRect().top - NAV_OFFSET <= 1) {
          current = s.getAttribute("data-tab-section") as TabKey;
        }
      }
      const first = sections[0].getAttribute("data-tab-section") as TabKey;
      const key = current ?? first;
      setActive((prev) => (prev === key ? prev : key));
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

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
 * One section of the page. Every section is in the document, always.
 *
 * This used to unmount everything but the active tab, which meant a visitor
 * saw roughly a sixth of Poshan at a time and had to already know the other
 * five existed to go looking for them. For a signed-out visitor deciding
 * whether this product is for them, that is the wrong trade: scrolling past
 * something you don't need costs a flick, while never learning it exists
 * costs the sale.
 *
 * So the tabs are section links now, not mount switches. The nav still
 * works exactly as before — click "Biomarkers", land on biomarkers — but
 * the rest of the page is above and below it rather than discarded.
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
  const { T } = useLang();
  const label = TABS.find((t) => t.key === tab)?.label;

  return (
    <section
      id={`panel-${tab}`}
      data-tab-section={tab}
      className="scroll-mt-[62px]"
      /* A labelled region rather than a tabpanel: with every section
         mounted at once this is a landmark on a long page, not one of a
         set of swapped panels, and role="tabpanel" would promise a screen
         reader a tab widget that no longer exists. */
      aria-label={label ? T(label) : undefined}
    >
      {children}
    </section>
  );
}
