# 001 — Animate the magnetic cursor's morph with transform, not width/height

- **Status**: DONE
- **Commit**: 8b7426f
- **Severity**: HIGH
- **Category**: Performance
- **Estimated scope**: 1 file, ~40 lines changed

## Problem

`src/components/ui/magnetic-cursor.tsx` implements a custom cursor that, on
hovering any element carrying the `data-magnetic` attribute, morphs from a
small circle into a rounded rectangle matching that element's bounding box
(the "magnetic hover" effect used across buttons and cards site-wide, per
`cursorClassName="food-cursor"` in `src/components/poshan/poshan-app.tsx`).

The morph-in (`handlePointerEnter`, lines 209-239) and morph-out
(`handlePointerLeave`, lines 241-273) both animate `width` and `height`
directly via GSAP:

```tsx
// src/components/ui/magnetic-cursor.tsx:224-238 — current
gsap.killTweensOf(cursorEl);
gsap.to(cursorEl, {
  x: centerX,
  y: centerY,
  width: bounds.width + dynamicPadding * 2,
  height: bounds.height + dynamicPadding * 2,
  borderRadius: computedStyle.borderRadius,
  backgroundColor: magneticColor,
  scaleX: 1,
  scaleY: 1,
  rotate: 0,
  duration: 0.3,
  ease: 'power3.out',
  overwrite: true,
});
```

```tsx
// src/components/ui/magnetic-cursor.tsx:258-272 — current
gsap.killTweensOf(cursorEl);
gsap.to(cursorEl, {
  width: cursorSize,
  height: cursorSize,
  borderRadius: shapeBorderRadius,
  backgroundColor: cursorColor,
  scaleX: 1,
  scaleY: 1,
  duration: detachDuration,
  ease: 'power3.out',
  overwrite: true,
  onComplete: () => {
    state.isDetaching = false;
  },
});
```

`width` and `height` are layout properties — animating them forces the
browser to recompute layout and paint on every tick of the tween, not just
composite (AUDIT.md §5: "Animate `transform` and `opacity` only.
`width`/`height`/`margin`/`padding`/`top`/`left` trigger layout + paint +
composite."). This cursor is `position: fixed`, so its own layout box
doesn't affect page layout, but the browser still has to lay out and paint
*that element itself* every frame — on a `pointer-events: none` overlay that
tracks the mouse at up to 120Hz on a high-polling device, this is
avoidable per-frame cost. It also fires on every hover of every
`data-magnetic` element site-wide, which per the frequency map is a "tens of
times per day" interaction, not a rare one.

The element also already declares `willChange: 'transform, width, height,
border-radius'` (line 326), which keeps `width`/`height` promoted to their
own compositing layer permanently — expensive to hold open for properties
that, after this fix, are no longer animated.

## Target

Replace the `width`/`height` tween with a `scaleX`/`scaleY` tween computed
from the ratio of the target box to the cursor's own base size. The cursor
element keeps a fixed `width: cursorSize` / `height: cursorSize` in its base
CSS (already true — see `styles` object, lines 320-334) and is scaled up to
cover the target's bounding box instead of being resized to it.

```tsx
// target — handlePointerEnter
const handlePointerEnter = () => {
  const state = cursorStateRef.current;
  if (!state) return;
  const { magneticFactor, hoverPadding, cursorSize } = configRef.current;

  state.hover.isHovered = true;
  state.isDetaching = false;

  const bounds = el.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(el);
  const magneticColor = el.getAttribute('data-magnetic-color') || cursorColor;
  const dynamicPadding = hoverPadding * (1 + magneticFactor);
  const centerX = bounds.left + bounds.width / 2;
  const centerY = bounds.top + bounds.height / 2;
  const targetWidth = bounds.width + dynamicPadding * 2;
  const targetHeight = bounds.height + dynamicPadding * 2;

  gsap.killTweensOf(cursorEl);
  gsap.to(cursorEl, {
    x: centerX,
    y: centerY,
    scaleX: targetWidth / cursorSize,
    scaleY: targetHeight / cursorSize,
    borderRadius: computedStyle.borderRadius,
    backgroundColor: magneticColor,
    rotate: 0,
    duration: 0.3,
    ease: 'power3.out',
    overwrite: true,
  });
};
```

```tsx
// target — handlePointerLeave
const handlePointerLeave = () => {
  const state = cursorStateRef.current;
  if (!state) return;
  const currentX = gsap.getProperty(cursorEl, 'x') as number;
  const currentY = gsap.getProperty(cursorEl, 'y') as number;

  state.pos.current.x = currentX;
  state.pos.current.y = currentY;
  state.pos.previous.x = currentX;
  state.pos.previous.y = currentY;

  state.hover.isHovered = false;
  state.isDetaching = true;

  const shapeBorderRadius = shape === 'circle' ? '50%' : shape === 'square' ? '0' : '8px';

  gsap.killTweensOf(cursorEl);
  gsap.to(cursorEl, {
    scaleX: 1,
    scaleY: 1,
    borderRadius: shapeBorderRadius,
    backgroundColor: cursorColor,
    duration: detachDuration,
    ease: 'power3.out',
    overwrite: true,
    onComplete: () => {
      state.isDetaching = false;
    },
  });
};
```

Also update the `willChange` declaration (line 326) to drop `width, height`:

```tsx
// target
willChange: 'transform, border-radius',
```

Note one interaction to preserve exactly: `update()` (the per-frame idle-track
loop, lines 113-152) already sets `scaleX`/`scaleY` on the cursor for its own
speed-stretch effect whenever `!state.hover.isHovered`. That function already
early-returns while `state.hover.isHovered` is true (line 115), so it will
not fight with the hover-morph's own `scaleX`/`scaleY` — no change needed
there, just confirm this remains true after the edit (it does, since `update`
is untouched).

## Repo conventions to follow

- The rest of the codebase already treats `transform`/`opacity` as the only
  animatable properties for anything hover- or frequently-triggered — e.g.
  `src/app/globals.css:1963-1967` (`.sweep::before`): *"scaleX from the left
  edge, not a width or background-position animation: this stays a
  compositor-only transform."* Follow that same reasoning here.
- `src/components/poshan/motion-layer.tsx:70-76` also documents deliberately
  driving `--rx`/`--ry`/`--mx`/`--my` (custom properties feeding a
  `transform`) rather than animating layout properties, batched into a single
  `requestAnimationFrame`. Same performance discipline, same file family.

## Boundaries

- Do NOT touch `update()` (lines 113-152), `onMouseMove` (168-191), or any of
  the `x`/`y` positioning logic — only the `width`/`height` → `scaleX`/`scaleY`
  substitution in `handlePointerEnter` and `handlePointerLeave`, plus the
  `willChange` string.
- Do NOT change `magneticFactor`, `hoverPadding`, `cursorSize`, or any other
  prop default.
- Do NOT add new dependencies — GSAP already provides everything needed.
- Do NOT touch `src/components/poshan/motion-layer.tsx` or any other file —
  this plan is scoped to `src/components/ui/magnetic-cursor.tsx` only.
- If the current code at these line numbers doesn't match what's quoted above
  (drift since commit 8b7426f), STOP and report instead of improvising.

## Verification

- **Mechanical**: `npx tsc --noEmit` from the repo root — expect no new
  errors. There is no dedicated animation test; this is a visual-only change.
- **Feel check**: start the dev server, open the site, and hover several
  elements carrying `data-magnetic` (nav links, primary buttons — check
  `src/components/poshan/nav.tsx` and `checkout-button.tsx` for examples).
  Confirm:
  - The cursor still visually grows to cover the hovered element and shrinks
    back on leave, with the same rounded-rectangle shape as before — the
    fix should look identical to the current behaviour, just computed
    differently.
  - No visible size "pop" or misalignment when entering/leaving quickly in
    succession (spam-hover several magnetic elements back to back).
  - In Chrome DevTools → Performance panel, record a few seconds of hovering
    magnetic elements: the "Layout" (purple) row should show near-zero time
    during the cursor morph, versus visible Layout activity before the fix.
  - In DevTools → Rendering → "Paint flashing", hovering a magnetic element
    should no longer flash the cursor's bounding area on every tween frame
    the way a width/height animation does.
- **Done when**: the cursor morph is visually indistinguishable from before,
  `tsc --noEmit` is clean, and the Performance panel shows no Layout
  recalculation attributable to the cursor during a hover-morph.
