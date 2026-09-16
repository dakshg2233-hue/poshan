"use client";

import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * A dropdown that cannot be clipped by whatever it happens to sit inside.
 *
 * The palette and cursor pickers were absolutely positioned inside the nav,
 * and two separate things made them invisible:
 *
 *  1. `.liquid-glass-chrome` sets `overflow: hidden` — it has to, the glass
 *     edge is painted by a masked ::before that would otherwise spill. So a
 *     panel escaping a 53px bar was cropped to 53px of itself.
 *  2. The nav slides on scroll, so an `absolute` child anchored to it was
 *     positioned against a box that had moved off the top of the window.
 *     Measured mid-scroll: the trigger's own parent sat at top:-46.
 *
 * Neither is fixable by nudging the offsets, because both are properties of
 * the ancestor rather than of the panel. Portalling to <body> and
 * positioning `fixed` against the trigger's live rect removes the ancestor
 * from the question entirely — which is what every production dropdown
 * does, and for exactly these two reasons.
 *
 * Flips above the trigger when there isn't room below, and clamps to the
 * viewport so a panel near the right edge stays on screen.
 *
 * No `mounted` flag: this renders nothing until `open`, and `open` only
 * ever becomes true from a click, which cannot happen during SSR or before
 * hydration. The flag would be a setState in an effect for a condition that
 * is already guaranteed.
 */
type Placement = { top: number; left: number; maxHeight: number; flipped: boolean };

export function AnchoredPanel({
  anchorRef,
  open,
  width,
  align = "end",
  children,
  className,
  style,
  ...rest
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  /** Panel width in px — needed up front so the clamp can be computed. */
  width: number;
  /** Which edge of the panel lines up with the trigger. */
  align?: "start" | "end";
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
} & React.HTMLAttributes<HTMLDivElement>) {
  const [pos, setPos] = useState<Placement | null>(null);

  /* Layout effect, not effect: the panel must be in its final place on the
     frame it first paints, or it visibly jumps from (0,0). */
  useLayoutEffect(() => {
    if (!open) return;

    const place = () => {
      const a = anchorRef.current?.getBoundingClientRect();
      if (!a) return;

      const GAP = 8;
      const MARGIN = 12;
      const below = window.innerHeight - a.bottom - GAP - MARGIN;
      const above = a.top - GAP - MARGIN;
      /* Below unless there is genuinely more room above — a dropdown that
         flips on a 20px difference feels unstable. */
      const flipped = below < 200 && above > below;

      const left = Math.min(
        Math.max(MARGIN, align === "end" ? a.right - width : a.left),
        Math.max(MARGIN, window.innerWidth - width - MARGIN)
      );

      const next: Placement = {
        top: flipped ? Math.max(MARGIN, a.top - GAP) : a.bottom + GAP,
        left,
        maxHeight: Math.max(160, flipped ? above : below),
        flipped,
      };

      /* Only commit a genuine change. This runs on every scroll frame, and
         setting an equal-but-new object each time would re-render the
         panel sixty times a second for nothing. */
      setPos((prev) =>
        prev &&
        prev.top === next.top &&
        prev.left === next.left &&
        prev.maxHeight === next.maxHeight &&
        prev.flipped === next.flipped
          ? prev
          : next
      );
    };

    place();
    /* The nav slides and the page scrolls under it, so the anchor moves.
       Re-measuring keeps the panel attached to the button that opened it
       rather than letting it drift. */
    window.addEventListener("scroll", place, { passive: true });
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place);
      window.removeEventListener("resize", place);
    };
  }, [open, anchorRef, width, align]);

  if (!open || !pos) return null;

  return createPortal(
    <div
      className={className}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        width,
        maxHeight: pos.maxHeight,
        overflowY: "auto",
        /* Above the nav (z-50) and the bottom bar, below the cursor. */
        zIndex: 80,
        /* When flipped, `top` is the trigger's own top edge, so the panel
           is pulled up by its own height to sit above it. Decided in the
           effect and carried in state — reading the anchor's rect here
           would be a ref access during render. */
        transform: pos.flipped ? "translateY(-100%)" : undefined,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>,
    document.body
  );
}
